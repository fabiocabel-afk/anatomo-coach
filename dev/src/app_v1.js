/* Corpo 3D — motor de exercícios (v1)
 * Corpo humano estilizado gerado 100% por código: esqueleto padrão (nomes VRM),
 * pele contínua com skinning por envelope, músculos separados com morph de contração,
 * poses em JSON, contato automático com o chão e câmera orbital.
 */
(function () {
  'use strict';
  const THREE = window.THREE;
  const V3 = THREE.Vector3;
  const rad = d => d * Math.PI / 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const SIDES = [[1, 'left'], [-1, 'right']];

  /* =====================================================================
   * 1. ESQUELETO — posição de repouso (bind pose), em metros, mundo:
   *    y = cima, +z = frente do corpo, +x = lado esquerdo do corpo.
   *    Palmas para frente (posição anatômica).
   * ===================================================================== */
  const BDEF = [];
  const BDEF_BY = {};
  function bdef(name, parent, head, tail) {
    const d = { name, parent, head, tail: tail || null };
    BDEF.push(d); BDEF_BY[name] = d;
  }
  bdef('hips', null, [0, 0.98, 0], [0, 1.06, 0]);
  bdef('spine', 'hips', [0, 1.06, 0]);
  bdef('chest', 'spine', [0, 1.22, 0]);
  bdef('upperChest', 'chest', [0, 1.36, 0], [0, 1.50, 0]);
  bdef('neck', 'upperChest', [0, 1.50, 0]);
  bdef('head', 'neck', [0, 1.58, 0], [0, 1.80, 0]);

  const FINGERS = {
    Index: { dx: 0.027, y: 0.790, len: [0.045, 0.027, 0.022], r: 0.0095 },
    Middle: { dx: 0.008, y: 0.785, len: [0.050, 0.030, 0.024], r: 0.0100 },
    Ring: { dx: -0.011, y: 0.790, len: [0.047, 0.028, 0.022], r: 0.0095 },
    Little: { dx: -0.028, y: 0.800, len: [0.037, 0.022, 0.020], r: 0.0085 }
  };
  const PHAL = ['Proximal', 'Intermediate', 'Distal'];

  for (const [s, p] of SIDES) {
    bdef(p + 'Shoulder', 'upperChest', [s * 0.03, 1.45, 0]);
    bdef(p + 'UpperArm', p + 'Shoulder', [s * 0.19, 1.42, -0.01]);
    bdef(p + 'LowerArm', p + 'UpperArm', [s * 0.20, 1.13, -0.02]);
    bdef(p + 'Hand', p + 'LowerArm', [s * 0.21, 0.87, 0], [s * 0.21, 0.785, 0.005]);
    for (const f in FINGERS) {
      const F = FINGERS[f];
      let y = F.y, par = p + 'Hand';
      for (let i = 0; i < 3; i++) {
        const nm = p + f + PHAL[i];
        const head = [s * (0.21 + F.dx), y, 0.005];
        y -= F.len[i];
        bdef(nm, par, head, i === 2 ? [s * (0.21 + F.dx), y, 0.005] : null);
        par = nm;
      }
    }
    bdef(p + 'ThumbMetacarpal', p + 'Hand', [s * 0.232, 0.865, 0.012]);
    bdef(p + 'ThumbProximal', p + 'ThumbMetacarpal', [s * 0.252, 0.830, 0.024]);
    bdef(p + 'ThumbDistal', p + 'ThumbProximal', [s * 0.263, 0.800, 0.030], [s * 0.270, 0.776, 0.033]);
    bdef(p + 'UpperLeg', 'hips', [s * 0.09, 0.93, 0]);
    bdef(p + 'LowerLeg', p + 'UpperLeg', [s * 0.095, 0.50, 0.01]);
    bdef(p + 'Foot', p + 'LowerLeg', [s * 0.10, 0.085, -0.01]);
    bdef(p + 'Toes', p + 'Foot', [s * 0.105, 0.02, 0.12], [s * 0.105, 0.015, 0.185]);
  }
  for (const d of BDEF) {
    if (!d.tail) {
      const child = BDEF.find(c => c.parent === d.name);
      d.tail = child ? child.head : d.head;
    }
  }

  /* ---------- Cena ---------- */
  const view = document.getElementById('view');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch (err) {
    view.innerHTML = '<p style="padding:24px;color:#A3164F">Este aparelho não conseguiu iniciar o 3D (WebGL).</p>';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0xF4F1F7, 1);
  view.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 60);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8a9c9, 0.78));
  const key = new THREE.DirectionalLight(0xffffff, 0.62); key.position.set(1.5, 3, 2.5); scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.28); fill.position.set(-2, 1.5, -1.5); scene.add(fill);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.7, 64), new THREE.MeshBasicMaterial({ color: 0xE7E0EF }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const shadowTex = (function () {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, 'rgba(60,30,90,0.32)'); gr.addColorStop(1, 'rgba(60,30,90,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002; scene.add(shadow);

  /* ---------- Ossos ---------- */
  const rig = new THREE.Group(); scene.add(rig);
  const bones = {}, boneList = [], boneIndex = {}, SEG = {};
  for (const d of BDEF) {
    const b = new THREE.Bone(); b.name = d.name;
    const ph = d.parent ? BDEF_BY[d.parent].head : [0, 0, 0];
    b.position.set(d.head[0] - ph[0], d.head[1] - ph[1], d.head[2] - ph[2]);
    (d.parent ? bones[d.parent] : rig).add(b);
    bones[d.name] = b; boneIndex[d.name] = boneList.length; boneList.push(b);
    SEG[d.name] = { a: new V3().fromArray(d.head), b: new V3().fromArray(d.tail) };
  }
  rig.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(boneList);

  /* =====================================================================
   * 2. GEOMETRIA — tubos com seção elíptica ao longo de uma curva
   * ===================================================================== */
  function tube(ctrl, o) {
    o = o || {};
    const radial = o.radial || 22;
    const n = ctrl.length;
    const segs = o.segs || Math.max(10, (n - 1) * 7);
    const curve = new THREE.CatmullRomCurve3(ctrl.map(c => new V3(c.p[0], c.p[1], c.p[2])), false, 'catmullrom', 0.5);
    const refv = new V3().fromArray(o.ref || [1, 0, 0]);
    const rings = [];
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const p = curve.getPoint(u);
      const T = curve.getTangent(u).normalize();
      const f = u * (n - 1);
      const k = Math.min(n - 2, Math.floor(f));
      let t = f - k; t = t * t * (3 - 2 * t);
      let rx = ctrl[k].rx + (ctrl[k + 1].rx - ctrl[k].rx) * t;
      let rz = ctrl[k].rz + (ctrl[k + 1].rz - ctrl[k].rz) * t;
      if (o.spindle) { const e = Math.pow(Math.sin(Math.PI * u), o.spindle); rx *= e; rz *= e; }
      rings.push({ p, T, rx: Math.max(rx, 4e-4), rz: Math.max(rz, 4e-4) });
    }
    function cap(r0, dir) {
      const out = [], capN = 6;
      const R = (r0.rx + r0.rz) / 2 * (o.capScale || 1);
      for (let k = 1; k <= capN; k++) {
        const phi = k / capN * Math.PI / 2, c = Math.cos(phi);
        out.push({ p: r0.p.clone().addScaledVector(r0.T, dir * R * Math.sin(phi)), T: r0.T, rx: Math.max(r0.rx * c, 2e-4), rz: Math.max(r0.rz * c, 2e-4) });
      }
      return out;
    }
    let all = rings;
    if (!o.spindle && o.capStart !== false) all = cap(rings[0], -1).reverse().concat(all);
    if (!o.spindle && o.capEnd !== false) all = all.concat(cap(rings[rings.length - 1], 1));
    const pos = [], idx = [];
    const a = new V3(), b = new V3();
    for (const r of all) {
      a.copy(refv).addScaledVector(r.T, -refv.dot(r.T));
      if (a.lengthSq() < 1e-8) a.set(0, 0, 1).addScaledVector(r.T, -r.T.z);
      a.normalize();
      b.crossVectors(r.T, a);
      for (let j = 0; j < radial; j++) {
        const th = j / radial * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
        pos.push(
          r.p.x + a.x * r.rx * c + b.x * r.rz * s,
          r.p.y + a.y * r.rx * c + b.y * r.rz * s,
          r.p.z + a.z * r.rx * c + b.z * r.rz * s);
      }
    }
    for (let i = 0; i < all.length - 1; i++) {
      for (let j = 0; j < radial; j++) {
        const v0 = i * radial + j, v1 = i * radial + (j + 1) % radial;
        const v2 = (i + 1) * radial + j, v3 = (i + 1) * radial + (j + 1) % radial;
        idx.push(v0, v1, v2, v1, v3, v2);
      }
    }
    return { pos, idx };
  }

  /* ---------- Pesos de skinning por envelope (distância aos ossos) ---------- */
  const _ab = new V3(), _ap = new V3(), _q = new V3();
  function distSeg(p, s) {
    _ab.subVectors(s.b, s.a);
    const L2 = _ab.lengthSq();
    let t = L2 > 0 ? _ap.subVectors(p, s.a).dot(_ab) / L2 : 0;
    t = clamp(t, 0, 1);
    _q.copy(s.a).addScaledVector(_ab, t);
    return p.distanceTo(_q);
  }
  function weightsFor(p, cands, exp) {
    const arr = [];
    for (const n of cands) {
      const d = distSeg(p, SEG[n]);
      arr.push([boneIndex[n], 1 / Math.pow(d + 0.012, exp)]);
    }
    arr.sort((x, y) => y[1] - x[1]);
    const top = arr.slice(0, 4);
    while (top.length < 4) top.push([0, 0]);
    const sum = top.reduce((acc, x) => acc + x[1], 0) || 1;
    return top.map(x => [x[0], x[1] / sum]);
  }
  function side(list, p) { return list.map(n => n.charAt(0) === '*' ? p + n.slice(1) : n); }

  function buildSkinned(parts, material, morphParts) {
    const P = [], I = [], SI = [], SW = [], M = [];
    let off = 0;
    const tmp = new V3();
    parts.forEach((pt, pi) => {
      for (let v = 0; v < pt.pos.length; v += 3) {
        tmp.set(pt.pos[v], pt.pos[v + 1], pt.pos[v + 2]);
        const w = weightsFor(tmp, pt.cands, pt.exp || 6);
        for (let k = 0; k < 4; k++) { SI.push(w[k][0]); SW.push(w[k][1]); }
        P.push(pt.pos[v], pt.pos[v + 1], pt.pos[v + 2]);
        if (morphParts) { const mp = morphParts[pi].pos; M.push(mp[v], mp[v + 1], mp[v + 2]); }
      }
      for (const i of pt.idx) I.push(i + off);
      off += pt.pos.length / 3;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4));
    geo.setIndex(I);
    geo.computeVertexNormals();
    if (morphParts) geo.morphAttributes.position = [new THREE.Float32BufferAttribute(M, 3)];
    const mesh = new THREE.SkinnedMesh(geo, material);
    mesh.frustumCulled = false;
    rig.add(mesh);
    mesh.bind(skeleton);
    return mesh;
  }

  /* ---------- Pele ---------- */
  const C_SKIN = 0xE6E1DA, C_IDLE = new THREE.Color(0xCDBFDB), C_PRI = new THREE.Color(0xEC357D), C_SEC = new THREE.Color(0xFF9901);
  const skinMat = new THREE.MeshStandardMaterial({ color: C_SKIN, roughness: 0.62, metalness: 0, skinning: true });
  const skinParts = [];
  const torsoC = ['hips', 'spine', 'chest', 'upperChest', 'neck', 'leftShoulder', 'rightShoulder', 'leftUpperLeg', 'rightUpperLeg'];
  skinParts.push(Object.assign(tube([
    { p: [0, 0.83, 0], rx: 0.07, rz: 0.06 },
    { p: [0, 0.87, 0], rx: 0.15, rz: 0.095 },
    { p: [0, 0.93, -0.005], rx: 0.170, rz: 0.105 },
    { p: [0, 0.99, 0], rx: 0.172, rz: 0.105 },
    { p: [0, 1.05, 0.005], rx: 0.158, rz: 0.097 },
    { p: [0, 1.11, 0.005], rx: 0.145, rz: 0.092 },
    { p: [0, 1.19, 0.005], rx: 0.152, rz: 0.097 },
    { p: [0, 1.27, 0.005], rx: 0.168, rz: 0.105 },
    { p: [0, 1.34, 0], rx: 0.180, rz: 0.110 },
    { p: [0, 1.40, -0.005], rx: 0.185, rz: 0.105 },
    { p: [0, 1.445, -0.01], rx: 0.170, rz: 0.085 },
    { p: [0, 1.48, -0.01], rx: 0.090, rz: 0.065 },
    { p: [0, 1.52, 0], rx: 0.058, rz: 0.055 },
    { p: [0, 1.58, 0.005], rx: 0.052, rz: 0.052 }
  ], { radial: 32, segs: 70, capScale: 0.6 }), { cands: torsoC, exp: 6 }));
  skinParts.push(Object.assign(tube([
    { p: [0, 1.555, 0.02], rx: 0.03, rz: 0.03 },
    { p: [0, 1.585, 0.015], rx: 0.068, rz: 0.075 },
    { p: [0, 1.63, 0.01], rx: 0.077, rz: 0.093 },
    { p: [0, 1.69, 0], rx: 0.080, rz: 0.100 },
    { p: [0, 1.75, -0.005], rx: 0.072, rz: 0.090 },
    { p: [0, 1.785, -0.005], rx: 0.045, rz: 0.055 }
  ], { radial: 28, segs: 30 }), { cands: ['head', 'neck'], exp: 6 }));
  skinParts.push(Object.assign(tube([
    { p: [0, 1.668, 0.088], rx: 0.011, rz: 0.009 },
    { p: [0, 1.650, 0.104], rx: 0.013, rz: 0.011 }
  ], { radial: 12, segs: 4 }), { cands: ['head'], exp: 6 }));

  for (const [s, p] of SIDES) {
    skinParts.push(Object.assign(tube([
      { p: [s * 0.175, 1.45, -0.01], rx: 0.055, rz: 0.055 },
      { p: [s * 0.195, 1.37, -0.01], rx: 0.050, rz: 0.052 },
      { p: [s * 0.200, 1.25, -0.015], rx: 0.045, rz: 0.047 },
      { p: [s * 0.200, 1.14, -0.02], rx: 0.037, rz: 0.038 },
      { p: [s * 0.205, 1.06, -0.012], rx: 0.040, rz: 0.036 },
      { p: [s * 0.208, 0.96, -0.005], rx: 0.033, rz: 0.028 },
      { p: [s * 0.210, 0.88, 0], rx: 0.028, rz: 0.020 }
    ], { radial: 22, segs: 48 }), { cands: side(['*Shoulder', '*UpperArm', '*LowerArm', '*Hand'], p), exp: 6 }));
    // palma
    skinParts.push(Object.assign(tube([
      { p: [s * 0.21, 0.885, 0.002], rx: 0.030, rz: 0.018 },
      { p: [s * 0.21, 0.845, 0.004], rx: 0.041, rz: 0.016 },
      { p: [s * 0.21, 0.795, 0.005], rx: 0.040, rz: 0.013 }
    ], { radial: 20, segs: 10, capScale: 0.5 }), { cands: side(['*LowerArm', '*Hand'], p), exp: 7 }));
    // eminência tenar (base do polegar)
    skinParts.push(Object.assign(tube([
      { p: [s * 0.222, 0.868, 0.012], rx: 0.012, rz: 0.012 },
      { p: [s * 0.240, 0.838, 0.020], rx: 0.016, rz: 0.014 },
      { p: [s * 0.250, 0.825, 0.023], rx: 0.011, rz: 0.011 }
    ], { radial: 14, segs: 8 }), { cands: side(['*Hand', '*ThumbMetacarpal'], p), exp: 7 }));
    // dedos
    for (const f in FINGERS) {
      const F = FINGERS[f];
      const names = PHAL.map(ph => p + f + ph);
      const pts = names.map(n => SEG[n].a.toArray()).concat([SEG[names[2]].b.toArray()]);
      const ctrl = pts.map((q, i) => ({ p: q, rx: F.r * (1 - i * 0.07), rz: F.r * (1 - i * 0.07) * 0.92 }));
      skinParts.push(Object.assign(tube(ctrl, { radial: 12, segs: 18 }), { cands: [p + 'Hand'].concat(names), exp: 8 }));
    }
    {
      const names = ['ThumbMetacarpal', 'ThumbProximal', 'ThumbDistal'].map(n => p + n);
      const pts = names.map(n => SEG[n].a.toArray()).concat([SEG[names[2]].b.toArray()]);
      const ctrl = pts.map((q, i) => ({ p: q, rx: 0.0115 - i * 0.0008, rz: 0.0105 - i * 0.0008 }));
      skinParts.push(Object.assign(tube(ctrl, { radial: 12, segs: 16 }), { cands: [p + 'Hand'].concat(names), exp: 8 }));
    }
    // perna
    skinParts.push(Object.assign(tube([
      { p: [s * 0.095, 0.95, 0.0], rx: 0.085, rz: 0.090 },
      { p: [s * 0.100, 0.86, 0.005], rx: 0.085, rz: 0.090 },
      { p: [s * 0.100, 0.72, 0.01], rx: 0.072, rz: 0.075 },
      { p: [s * 0.097, 0.58, 0.015], rx: 0.056, rz: 0.058 },
      { p: [s * 0.095, 0.50, 0.015], rx: 0.048, rz: 0.050 },
      { p: [s * 0.097, 0.40, 0.0], rx: 0.050, rz: 0.056 },
      { p: [s * 0.100, 0.26, -0.005], rx: 0.042, rz: 0.045 },
      { p: [s * 0.100, 0.13, -0.008], rx: 0.030, rz: 0.032 },
      { p: [s * 0.100, 0.08, -0.01], rx: 0.028, rz: 0.030 }
    ], { radial: 24, segs: 64 }), { cands: side(['hips', '*UpperLeg', '*LowerLeg', '*Foot'], p), exp: 6 }));
    // pé
    skinParts.push(Object.assign(tube([
      { p: [s * 0.100, 0.035, -0.055], rx: 0.032, rz: 0.035 },
      { p: [s * 0.100, 0.042, 0.0], rx: 0.038, rz: 0.042 },
      { p: [s * 0.103, 0.030, 0.08], rx: 0.045, rz: 0.030 },
      { p: [s * 0.105, 0.020, 0.15], rx: 0.045, rz: 0.018 },
      { p: [s * 0.105, 0.016, 0.19], rx: 0.040, rz: 0.014 }
    ], { radial: 20, segs: 24, capScale: 0.7 }), { cands: side(['*LowerLeg', '*Foot', '*Toes'], p), exp: 7 }));
  }
  buildSkinned(skinParts, skinMat);

  /* =====================================================================
   * 3. MÚSCULOS — cada um é uma malha própria, presa aos ossos por skinning,
   *    com um "morph" de contração (fica mais grosso quando trabalha).
   *    Coordenadas do lado esquerdo; o lado direito é espelhado.
   * ===================================================================== */
  const MUSCLE_NAMES = {
    peitoral: 'Peitoral', deltoide: 'Deltoides', biceps: 'Bíceps', triceps: 'Tríceps', antebraco: 'Antebraço',
    trapezio: 'Trapézio', dorsal: 'Grande dorsal', abdomen: 'Reto abdominal', obliquos: 'Oblíquos',
    gluteo: 'Glúteos', quadriceps: 'Quadríceps', isquiotibiais: 'Isquiotibiais', adutores: 'Adutores',
    panturrilha: 'Panturrilha', tibial: 'Tibial anterior'
  };
  const MUSCLES = [
    { id: 'peitoral', pts: [[0.03, 1.32, 0.108], [0.10, 1.35, 0.095], [0.165, 1.385, 0.06]], w: [0.10, 0.10, 0.035], t: [0.024, 0.03, 0.016], out: [0, 0, 1], cand: ['upperChest', 'chest', '*Shoulder', '*UpperArm'] },
    { id: 'deltoide', pts: [[0.14, 1.465, 0.0], [0.205, 1.435, 0.0], [0.225, 1.34, -0.005]], w: [0.09, 0.11, 0.04], t: [0.03, 0.04, 0.02], out: [1, 0.6, 0], cand: ['*Shoulder', '*UpperArm', 'upperChest'] },
    { id: 'biceps', pts: [[0.19, 1.37, 0.035], [0.20, 1.26, 0.04], [0.203, 1.15, 0.02]], w: [0.035, 0.045, 0.025], t: [0.02, 0.035, 0.015], out: [0, 0, 1], cand: ['*UpperArm', '*LowerArm', '*Shoulder'] },
    { id: 'triceps', pts: [[0.195, 1.39, -0.055], [0.20, 1.27, -0.065], [0.20, 1.15, -0.05]], w: [0.04, 0.05, 0.03], t: [0.02, 0.03, 0.015], out: [0, 0, -1], cand: ['*UpperArm', '*LowerArm', '*Shoulder'] },
    { id: 'antebraco', pts: [[0.205, 1.12, 0.02], [0.207, 1.04, 0.025], [0.209, 0.93, 0.018]], w: [0.05, 0.055, 0.03], t: [0.02, 0.028, 0.012], out: [0, 0, 1], cand: ['*LowerArm', '*Hand'] },
    { id: 'trapezio', pts: [[0.0, 1.53, -0.045], [0.07, 1.475, -0.06], [0.15, 1.455, -0.03]], w: [0.06, 0.09, 0.05], t: [0.02, 0.03, 0.015], out: [0, 0.6, -1], cand: ['neck', 'upperChest', '*Shoulder'] },
    { id: 'dorsal', pts: [[0.04, 1.12, -0.095], [0.10, 1.24, -0.098], [0.145, 1.35, -0.07]], w: [0.07, 0.10, 0.035], t: [0.02, 0.03, 0.015], out: [0.4, 0, -1], cand: ['chest', 'spine', 'upperChest'] },
    { id: 'abdomen', center: true, pts: [[0, 0.93, 0.098], [0, 1.08, 0.095], [0, 1.27, 0.105]], w: [0.09, 0.11, 0.12], t: [0.02, 0.025, 0.02], out: [0, 0, 1], cand: ['hips', 'spine', 'chest'] },
    { id: 'obliquos', pts: [[0.13, 0.99, 0.04], [0.14, 1.10, 0.035], [0.145, 1.21, 0.045]], w: [0.05, 0.06, 0.05], t: [0.02, 0.025, 0.015], out: [1, 0, 0.4], cand: ['hips', 'spine', 'chest'] },
    { id: 'gluteo', pts: [[0.07, 1.0, -0.105], [0.095, 0.92, -0.12], [0.115, 0.84, -0.085]], w: [0.11, 0.13, 0.07], t: [0.03, 0.045, 0.02], out: [0.3, 0, -1], cand: ['hips', '*UpperLeg'] },
    { id: 'quadriceps', pts: [[0.10, 0.87, 0.085], [0.10, 0.72, 0.087], [0.097, 0.56, 0.07]], w: [0.08, 0.085, 0.05], t: [0.025, 0.04, 0.02], out: [0, 0, 1], cand: ['*UpperLeg', '*LowerLeg', 'hips'] },
    { id: 'isquiotibiais', pts: [[0.10, 0.86, -0.08], [0.10, 0.71, -0.065], [0.098, 0.57, -0.045]], w: [0.07, 0.07, 0.04], t: [0.025, 0.035, 0.015], out: [0, 0, -1], cand: ['*UpperLeg', '*LowerLeg', 'hips'] },
    { id: 'adutores', pts: [[0.035, 0.86, 0.0], [0.045, 0.76, 0.005], [0.065, 0.62, 0.0]], w: [0.07, 0.06, 0.03], t: [0.02, 0.03, 0.015], out: [-1, 0, 0], cand: ['hips', '*UpperLeg'] },
    { id: 'panturrilha', pts: [[0.097, 0.48, -0.04], [0.098, 0.38, -0.06], [0.10, 0.24, -0.04]], w: [0.06, 0.07, 0.035], t: [0.025, 0.04, 0.015], out: [0, 0, -1], cand: ['*LowerLeg', '*Foot', '*UpperLeg'] },
    { id: 'tibial', pts: [[0.108, 0.46, 0.045], [0.11, 0.33, 0.04], [0.105, 0.16, 0.03]], w: [0.025, 0.03, 0.02], t: [0.012, 0.018, 0.01], out: [0.3, 0, 1], cand: ['*LowerLeg', '*Foot'] }
  ];
  const MUSC = {};
  for (const m of MUSCLES) {
    const sides = m.center ? [[1, 'left']] : SIDES;
    for (const [s, p] of sides) {
      const pts = m.pts.map(q => [q[0] * s, q[1], q[2]]);
      const out = new V3(m.out[0] * s, m.out[1], m.out[2]).normalize();
      const T = new V3().fromArray(pts[pts.length - 1]).sub(new V3().fromArray(pts[0])).normalize();
      const ref = new V3().crossVectors(T, out).normalize().toArray();
      const base = pts.map((q, i) => ({ p: q, rx: m.w[i] / 2, rz: m.t[i] / 2 }));
      const fat = pts.map((q, i) => ({ p: q, rx: m.w[i] / 2 * 1.06, rz: m.t[i] / 2 * 1.75 }));
      const opt = { ref, spindle: 0.55, radial: 16, segs: 18 };
      const g0 = Object.assign(tube(base, opt), { cands: side(m.cand, p), exp: 6 });
      const g1 = tube(fat, opt);
      const mat = new THREE.MeshStandardMaterial({ color: C_IDLE.clone(), roughness: 0.5, metalness: 0, skinning: true, morphTargets: true });
      const mesh = buildSkinned([g0], mat, [g1]);
      (MUSC[m.id] = MUSC[m.id] || []).push(mesh);
    }
  }

  /* ---------- Pontos de contato com o chão ---------- */
  function marker(bone, world) {
    const o = new THREE.Object3D();
    const h = SEG[bone].a;
    o.position.set(world[0] - h.x, world[1] - h.y, world[2] - h.z);
    bones[bone].add(o);
    return o;
  }
  const CONTACT = { feet: [], hands: [] };
  for (const [s, p] of SIDES) {
    CONTACT.feet.push(marker(p + 'Foot', [s * 0.10, 0.0, -0.055]));
    CONTACT.feet.push(marker(p + 'Toes', [s * 0.105, 0.0, 0.12]));
    CONTACT.feet.push(marker(p + 'Toes', [s * 0.105, 0.003, 0.188]));
    CONTACT.hands.push(marker(p + 'Hand', [s * 0.21, 0.825, 0.018]));
    CONTACT.hands.push(marker(p + 'Hand', [s * 0.21, 0.792, 0.016]));
  }
  const ALL_CONTACTS = CONTACT.feet.concat(CONTACT.hands);

  /* ---------- Halteres (acessório preso à mão) ---------- */
  const dumbbells = [];
  (function () {
    const mPlate = new THREE.MeshStandardMaterial({ color: 0x3A3342, roughness: 0.45, metalness: 0.2 });
    const mBar = new THREE.MeshStandardMaterial({ color: 0x9A93A3, roughness: 0.3, metalness: 0.6 });
    for (const [s, p] of SIDES) {
      const g = new THREE.Group();
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.15, 14), mBar);
      bar.rotation.z = Math.PI / 2; g.add(bar);
      for (const k of [-1, 1]) {
        const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.03, 24), mPlate);
        pl.rotation.z = Math.PI / 2; pl.position.x = k * 0.062; g.add(pl);
      }
      const h = SEG[p + 'Hand'].a;
      g.position.set(s * 0.21 - h.x, 0.805 - h.y, 0.028 - h.z);
      g.visible = false;
      bones[p + 'Hand'].add(g);
      dumbbells.push(g);
    }
  })();

  /* =====================================================================
   * 4. EXERCÍCIOS — só dados. Cada um tem pose A (início) e pose B (fim).
   *    Ângulos em graus [x, y, z] relativos à posição de repouso.
   *    x negativo = flexão para frente (braços/pernas/dedos); x positivo na
   *    coluna = inclinar o tronco para frente.
   * ===================================================================== */
  function both(name, v) {
    const o = {};
    o['left' + name] = v;
    o['right' + name] = [v[0], -v[1], -v[2]];
    return o;
  }
  function grip(a, b, c, t) {
    const o = {};
    for (const [, p] of SIDES) {
      for (const f in FINGERS) {
        o[p + f + 'Proximal'] = [a, 0, 0];
        o[p + f + 'Intermediate'] = [b, 0, 0];
        o[p + f + 'Distal'] = [c, 0, 0];
      }
      o[p + 'ThumbMetacarpal'] = [t * 0.4, 0, 0];
      o[p + 'ThumbProximal'] = [t, 0, 0];
      o[p + 'ThumbDistal'] = [t, 0, 0];
    }
    return o;
  }
  const relaxed = grip(-8, -12, -6, -8);
  const fist = grip(-80, -95, -55, -45);
  const flat = grip(-4, -4, -2, 0);

  const EXERCICIOS = [
    {
      id: 'agachamento', nome: 'Agachamento',
      desc: 'Desça como se fosse sentar numa cadeira, peito aberto e joelhos na linha dos pés.',
      prim: ['quadriceps', 'gluteo'], sec: ['adutores', 'isquiotibiais', 'abdomen'],
      cam: { th: 62, ph: 12, dist: 3.4, ty: 0.80 }, anchor: 'feet', periodo: 3.2,
      A: Object.assign({}, relaxed),
      B: Object.assign({}, relaxed, both('UpperLeg', [-100, 0, 8]), both('LowerLeg', [120, 0, 0]), both('Foot', [-22, 0, 0]),
        { spine: [18, 0, 0], chest: [12, 0, 0], upperChest: [4, 0, 0], neck: [-22, 0, 0] },
        both('UpperArm', [-100, 0, 0]), both('LowerArm', [-8, 0, 0]))
    },
    {
      id: 'flexao', nome: 'Flexão de braço',
      desc: 'Corpo reto da cabeça aos pés; desça o peito perto do chão com os cotovelos para trás.',
      prim: ['peitoral', 'triceps'], sec: ['deltoide', 'abdomen'],
      cam: { th: 42, ph: 18, dist: 4.3, ty: 0.30 }, anchor: 'hands', pitch: 'auto', sombra: [1, 2.2],
      periodo: 2.8,
      A: Object.assign({}, flat, both('UpperArm', [-80, 0, 6]), both('LowerArm', [-10, 0, 0]), both('Hand', [90, 0, 90]),
        both('Toes', [-60, 0, 0]), { neck: [-25, 0, 0] }),
      B: Object.assign({}, flat, both('UpperArm', [-12, 0, 14]), both('LowerArm', [-78, 0, 0]), both('Hand', [90, 0, 90]),
        both('Toes', [-60, 0, 0]), { neck: [-25, 0, 0] })
    },
    {
      id: 'rosca', nome: 'Rosca bíceps',
      desc: 'Cotovelos colados ao corpo; suba o peso só dobrando o cotovelo.',
      prim: ['biceps'], sec: ['antebraco'],
      cam: { th: 42, ph: 8, dist: 2.5, ty: 1.12 }, anchor: 'feet', halteres: true, periodo: 2.8,
      A: Object.assign({}, fist, both('UpperArm', [-4, 0, 3]), both('LowerArm', [-6, 0, 0])),
      B: Object.assign({}, fist, both('UpperArm', [-10, 0, 3]), both('LowerArm', [-135, 0, 0]))
    },
    {
      id: 'elevacao', nome: 'Elevação lateral',
      desc: 'Suba os braços pelas laterais até a altura dos ombros, cotovelos levemente dobrados.',
      prim: ['deltoide'], sec: ['trapezio'],
      cam: { th: 0, ph: 6, dist: 3.1, ty: 1.08 }, anchor: 'feet', halteres: true, periodo: 3,
      A: Object.assign({}, fist, both('UpperArm', [0, 0, 8]), both('LowerArm', [-12, 0, 0]), both('Hand', [0, 90, 0])),
      B: Object.assign({}, fist, both('UpperArm', [0, 0, 86]), both('LowerArm', [-15, 0, 0]), both('Hand', [0, 90, 0]))
    },
    {
      id: 'desenvolvimento', nome: 'Desenvolvimento',
      desc: 'Empurre os halteres da altura dos ombros até em cima, sem arquear as costas.',
      prim: ['deltoide', 'triceps'], sec: ['trapezio', 'peitoral'],
      cam: { th: 22, ph: 8, dist: 3.3, ty: 1.15 }, anchor: 'feet', halteres: true, periodo: 3,
      A: Object.assign({}, fist, both('UpperArm', [0, 0, 82]), both('LowerArm', [0, 0, 95])),
      B: Object.assign({}, fist, both('UpperArm', [0, 0, 166]), both('LowerArm', [0, 0, 8]))
    },
    {
      id: 'panturrilha', nome: 'Elevação de panturrilha',
      desc: 'Suba na ponta dos pés devagar e desça controlando o movimento.',
      prim: ['panturrilha'], sec: [],
      cam: { th: 78, ph: 6, dist: 2.9, ty: 0.62 }, anchor: 'feet', periodo: 2.4,
      A: Object.assign({}, relaxed),
      B: Object.assign({}, relaxed, both('Foot', [36, 0, 0]), both('Toes', [-36, 0, 0]))
    }
  ];

  /* =====================================================================
   * 5. ANIMAÇÃO, CHÃO E CÂMERA
   * ===================================================================== */
  const ZERO = [0, 0, 0];
  let cur = EXERCICIOS[0], playing = true, t = 0, phase = 0, reps = 0, lastCycle = 0, speed = 1;
  const _w = new V3();
  function minY(list) { let m = Infinity; for (const o of list) { o.getWorldPosition(_w); if (_w.y < m) m = _w.y; } return m; }
  function avgZ(list) { let z = 0; for (const o of list) { o.getWorldPosition(_w); z += _w.z; } return z / list.length; }

  function applyPose(p) {
    const A = cur.A, B = cur.B;
    for (const b of boneList) {
      const a = A[b.name] || ZERO, c = B[b.name] || ZERO;
      b.rotation.set(rad(a[0] + (c[0] - a[0]) * p), rad(a[1] + (c[1] - a[1]) * p), rad(a[2] + (c[2] - a[2]) * p));
    }
    rig.position.set(0, 0, 0);
    rig.rotation.set(0, 0, 0);
    if (cur.pitch === 'auto') {
      let lo = rad(15), hi = rad(115);
      for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2;
        rig.rotation.x = mid; rig.updateMatrixWorld(true);
        if (minY(CONTACT.hands) - minY(CONTACT.feet) > 0) lo = mid; else hi = mid;
      }
      rig.rotation.x = (lo + hi) / 2;
    }
    rig.updateMatrixWorld(true);
    rig.position.y = -minY(ALL_CONTACTS);
    rig.position.z = cur._z0 - avgZ(CONTACT[cur.anchor]);
    rig.updateMatrixWorld(true);
    bones.hips.getWorldPosition(_w);
    shadow.position.x = _w.x; shadow.position.z = _w.z;
  }
  function calibrate() {
    cur._z0 = 0;
    applyPose(0);
    const az = avgZ(CONTACT[cur.anchor]) - rig.position.z;
    bones.hips.getWorldPosition(_w);
    const hz = _w.z - rig.position.z;
    cur._z0 = az - hz;
    const sc = cur.sombra || [1, 1];
    shadow.scale.set(sc[0], sc[1], 1);
  }

  function applyMuscles(p) {
    for (const id in MUSC) {
      const role = cur.prim.includes(id) ? 2 : cur.sec.includes(id) ? 1 : 0;
      for (const mesh of MUSC[id]) {
        const c = mesh.material.color;
        if (role === 2) { c.copy(C_IDLE).lerp(C_PRI, 0.35 + 0.65 * p); mesh.morphTargetInfluences[0] = p; }
        else if (role === 1) { c.copy(C_IDLE).lerp(C_SEC, 0.25 + 0.45 * p); mesh.morphTargetInfluences[0] = 0.45 * p; }
        else { c.copy(C_IDLE); mesh.morphTargetInfluences[0] = 0; }
      }
    }
  }

  // câmera orbital
  const cam = { th: 0, ph: 0, dist: 3, ty: 1 }, camT = { th: 0, ph: 0, dist: 3, ty: 1 };
  let tweening = false;
  function bestAngle(instant) {
    const c = cur.cam;
    camT.th = rad(c.th); camT.ph = rad(c.ph); camT.dist = c.dist; camT.ty = c.ty;
    const twoPi = Math.PI * 2;
    cam.th = camT.th + ((((cam.th - camT.th + Math.PI) % twoPi) + twoPi) % twoPi) - Math.PI;
    if (instant) Object.assign(cam, camT); else tweening = true;
  }
  function placeCamera() {
    if (tweening) {
      let done = true;
      for (const k of ['th', 'ph', 'dist', 'ty']) {
        cam[k] += (camT[k] - cam[k]) * 0.09;
        if (Math.abs(camT[k] - cam[k]) > 0.002) done = false;
      }
      if (done) { Object.assign(cam, camT); tweening = false; }
    }
    const cp = Math.cos(cam.ph);
    camera.position.set(cam.dist * Math.sin(cam.th) * cp, cam.ty + cam.dist * Math.sin(cam.ph), cam.dist * Math.cos(cam.th) * cp);
    camera.lookAt(0, cam.ty, 0);
  }

  // toque: 1 dedo gira, 2 dedos zoom; mouse: arrastar + roda
  const ptrs = new Map();
  let pinch0 = 0, dist0 = 0;
  const cv = renderer.domElement;
  const hint = document.getElementById('hint');
  function hideHint() { if (hint) hint.style.opacity = '0'; }
  function pinchDist() { const a = [...ptrs.values()]; return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); }
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    tweening = false; hideHint();
    if (ptrs.size === 2) { pinch0 = pinchDist(); dist0 = cam.dist; }
  });
  cv.addEventListener('pointermove', e => {
    const pr = ptrs.get(e.pointerId); if (!pr) return;
    const dx = e.clientX - pr.x, dy = e.clientY - pr.y;
    pr.x = e.clientX; pr.y = e.clientY;
    if (ptrs.size === 1) {
      cam.th -= dx * 0.009;
      cam.ph = clamp(cam.ph + dy * 0.007, rad(-12), rad(80));
    } else if (ptrs.size === 2 && pinch0 > 0) {
      cam.dist = clamp(dist0 * pinch0 / Math.max(pinchDist(), 1), 1.2, 7);
    }
  });
  function ptrEnd(e) { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; }
  cv.addEventListener('pointerup', ptrEnd);
  cv.addEventListener('pointercancel', ptrEnd);
  cv.addEventListener('wheel', e => { e.preventDefault(); tweening = false; cam.dist = clamp(cam.dist * (1 + e.deltaY * 0.001), 1.2, 7); }, { passive: false });

  function resize() {
    const w = view.clientWidth || 1, h = view.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(view);
  window.addEventListener('resize', resize);
  resize();

  /* =====================================================================
   * 6. INTERFACE
   * ===================================================================== */
  const $ = id => document.getElementById(id);
  const chips = $('chips');
  const ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>';
  const ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></svg>';

  function renderInfo() {
    $('nome').textContent = cur.nome;
    $('desc').textContent = cur.desc;
    const mus = $('mus'); mus.innerHTML = '';
    for (const id of cur.prim) { const s = document.createElement('span'); s.className = 'm p'; s.textContent = MUSCLE_NAMES[id]; mus.appendChild(s); }
    for (const id of cur.sec) { const s = document.createElement('span'); s.className = 'm s'; s.textContent = MUSCLE_NAMES[id]; mus.appendChild(s); }
    for (const el of chips.children) el.classList.toggle('on', el.dataset.id === cur.id);
  }
  function setExercise(id, instantCam) {
    cur = EXERCICIOS.find(e => e.id === id) || EXERCICIOS[0];
    t = 0; phase = 0; reps = 0; lastCycle = 0;
    $('nReps').textContent = '0';
    for (const d of dumbbells) d.visible = !!cur.halteres;
    calibrate();
    applyPose(0); applyMuscles(0);
    bestAngle(instantCam);
    renderInfo();
  }
  function setPlaying(v) {
    playing = v;
    const b = $('bPlay');
    b.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
    b.setAttribute('aria-label', playing ? 'Pausar' : 'Continuar');
  }
  for (const ex of EXERCICIOS) {
    const b = document.createElement('button');
    b.className = 'chip'; b.dataset.id = ex.id; b.textContent = ex.nome;
    b.addEventListener('click', () => { setExercise(ex.id); b.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); });
    chips.appendChild(b);
  }
  $('bPlay').addEventListener('click', () => setPlaying(!playing));
  $('bBest').addEventListener('click', () => bestAngle(false));
  for (const b of $('spd').querySelectorAll('button')) {
    b.addEventListener('click', () => {
      speed = parseFloat(b.dataset.v);
      for (const o of $('spd').children) o.classList.toggle('on', o === b);
    });
  }

  setExercise(EXERCICIOS[0].id, true);
  setPlaying(true);

  let last = null;
  function loop(ts) {
    if (last === null) last = ts;
    const dt = Math.min((ts - last) / 1000, 0.1); last = ts;
    if (playing) {
      t += dt;
      const per = cur.periodo * speed;
      phase = (1 - Math.cos(2 * Math.PI * t / per)) / 2;
      const cyc = Math.floor(t / per);
      if (cyc > lastCycle) { lastCycle = cyc; reps++; $('nReps').textContent = String(reps); }
    }
    applyPose(phase);
    applyMuscles(phase);
    placeCamera();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // gancho para testes automatizados
  window.__corpo = {
    exercicios: EXERCICIOS.map(e => e.id),
    setExercise: id => setExercise(id, true),
    setPhase: p => { setPlaying(false); phase = p; },
    setView: (th, ph, dist, ty) => { tweening = false; cam.th = rad(th); cam.ph = rad(ph); cam.dist = dist; cam.ty = ty; },
    medir: () => {
      return {
        minFeet: minY(CONTACT.feet), minHands: minY(CONTACT.hands),
        minAll: minY(ALL_CONTACTS), ossos: boneList.length, musculos: Object.keys(MUSC).length
      };
    }
  };
})();
