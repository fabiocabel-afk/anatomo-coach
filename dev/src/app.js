/* AnatoMotion — motor de exercícios (antigo Corpo 3D)
 * Boneco muscular estilo atlas de anatomia, gerado 100% por código:
 *  - esqueleto padrão (nomes VRM) com dedos das mãos e osso de giro no antebraço;
 *  - corpo-base (camada profunda) + cabeça/mãos/pés estilo boneco articulável;
 *  - ~42 músculos por lado moldados na superfície do corpo, com barriga, tendões e fibras;
 *  - estado de cada músculo (repouso / principal / auxiliar / foco) num shader;
 *  - toque no músculo mostra nome técnico e popular e foca a câmera.
 */
(function () {
  'use strict';
  const THREE = window.THREE;

  /* ---------- Perfis: cada pessoa tem seus treinos, ajustes, músicas e preferências ---------- */
  const PERFIS_KEY = 'anatomotion.perfis.v1';
  const BASES_PERFIL = ['corpo3d.treino.v1', 'corpo3d.treinos.v1', 'corpo3d.musica.v1', 'corpo3d.catalogo.v1', 'anatomotion.corpo.v1', 'anatomotion.historico.v1', 'anatomotion.camera.v1'];
  const CORES_PERFIL = ['#642A90', '#EC357D', '#FF9901', '#99CC33', '#0164C9', '#2BB3A3'];
  let perfisErro = '';
  const PERFIS = (function () {
    let reg = null;
    try { reg = JSON.parse(localStorage.getItem(PERFIS_KEY) || 'null'); } catch (e) { reg = null; }
    if (!reg || !Array.isArray(reg.lista) || !reg.lista.length) {
      reg = { v: 1, lista: [{ id: 'p1', nome: 'Perfil 1', cor: CORES_PERFIL[0], criado: Date.now() }], atual: 'p1' };
      try {
        // primeira vez: o que já estava salvo no aparelho passa a ser do Perfil 1 (o original fica guardado)
        for (const b of BASES_PERFIL) { const v = localStorage.getItem(b); if (v !== null && localStorage.getItem(b + '@p1') === null) localStorage.setItem(b + '@p1', v); }
        localStorage.setItem(PERFIS_KEY, JSON.stringify(reg));
      } catch (e) { perfisErro = 'Não consegui gravar os perfis neste aparelho.'; }
    }
    reg.lista = reg.lista.filter(p => p && p.id && p.nome);
    if (!reg.lista.some(p => p.id === reg.atual)) reg.atual = reg.lista[0].id;
    return reg;
  })();
  const chave = base => base + '@' + PERFIS.atual;
  if (window.Musica) Musica.definirPerfil(PERFIS.atual);
  const V3 = THREE.Vector3;
  const rad = d => d * Math.PI / 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const SIDES = [[1, 'left'], [-1, 'right']];

  /* =====================================================================
   * 1. ESQUELETO (posição de repouso, metros; y = cima, +z = frente,
   *    +x = lado esquerdo do corpo; palmas para frente)
   * ===================================================================== */
  const BDEF = [], BDEF_BY = {};
  function bdef(name, parent, head, tail) { const d = { name, parent, head, tail: tail || null }; BDEF.push(d); BDEF_BY[name] = d; }
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
    bdef(p + 'LowerArmTwist', p + 'LowerArm', [s * 0.205, 1.00, -0.01]);
    bdef(p + 'Hand', p + 'LowerArmTwist', [s * 0.21, 0.87, 0], [s * 0.21, 0.785, 0.005]);
    for (const f in FINGERS) {
      const F = FINGERS[f]; let y = F.y, par = p + 'Hand';
      for (let i = 0; i < 3; i++) {
        const nm = p + f + PHAL[i]; const head = [s * (0.21 + F.dx), y, 0.005]; y -= F.len[i];
        bdef(nm, par, head, i === 2 ? [s * (0.21 + F.dx), y, 0.005] : null); par = nm;
      }
    }
    bdef(p + 'ThumbMetacarpal', p + 'Hand', [s * 0.232, 0.865, 0.012]);
    bdef(p + 'ThumbProximal', p + 'ThumbMetacarpal', [s * 0.252, 0.830, 0.024]);
    bdef(p + 'ThumbDistal', p + 'ThumbProximal', [s * 0.263, 0.800, 0.030], [s * 0.270, 0.776, 0.033]);
    bdef(p + 'UpperLeg', 'hips', [s * 0.09, 0.93, 0]);
    bdef(p + 'LowerLeg', p + 'UpperLeg', [s * 0.095, 0.50, 0.01]);
    bdef(p + 'Foot', p + 'LowerLeg', [s * 0.10, 0.085, -0.01]);
    bdef(p + 'Toes', p + 'Foot', [s * 0.105, 0.02, 0.135], [s * 0.105, 0.015, 0.19]);
  }
  for (const d of BDEF) if (!d.tail) { const c = BDEF.find(x => x.parent === d.name); d.tail = c ? c.head : d.head; }

  /* ---------- Cena ---------- */
  const view = document.getElementById('view');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
  catch (err) { view.innerHTML = '<p style="padding:24px;color:#ff8fa8">Este aparelho não conseguiu iniciar o 3D (WebGL).</p>'; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x131016, 1);
  view.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.03, 60);
  scene.add(new THREE.HemisphereLight(0xfff4ee, 0x2a1f2e, 0.62));
  const key = new THREE.DirectionalLight(0xfff1e6, 0.78); key.position.set(1.6, 3, 2.4); scene.add(key);
  const fillL = new THREE.DirectionalLight(0xffffff, 0.22); fillL.position.set(-2.2, 1.2, 1.4); scene.add(fillL);
  const rim = new THREE.DirectionalLight(0xc7a8ff, 0.42); rim.position.set(-1, 2, -2.6); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.7, 72), new THREE.MeshBasicMaterial({ color: 0x1d1922 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const shadowTex = (function () {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
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
    if (/Hand$/.test(d.name) || /UpperLeg$/.test(d.name)) b.rotation.order = 'YXZ';
    (d.parent ? bones[d.parent] : rig).add(b);
    bones[d.name] = b; boneIndex[d.name] = boneList.length; boneList.push(b);
    SEG[d.name] = { a: new V3().fromArray(d.head), b: new V3().fromArray(d.tail) };
  }
  rig.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(boneList);

  /* =====================================================================
   * 2. GEOMETRIA BASE — tubos de seção elíptica ao longo de uma curva
   * ===================================================================== */
  function tube(ctrl, o) {
    o = o || {};
    const radial = o.radial || 22, n = ctrl.length;
    const segs = o.segs || Math.max(10, (n - 1) * 7);
    const curve = new THREE.CatmullRomCurve3(ctrl.map(c => new V3(c.p[0], c.p[1], c.p[2])), false, 'catmullrom', 0.5);
    const refv = new V3().fromArray(o.ref || [1, 0, 0]);
    const rings = [];
    for (let i = 0; i <= segs; i++) {
      const u = i / segs, p = curve.getPoint(u), T = curve.getTangent(u).normalize();
      const f = u * (n - 1), k = Math.min(n - 2, Math.floor(f)); let t = f - k; t = t * t * (3 - 2 * t);
      const rx = ctrl[k].rx + (ctrl[k + 1].rx - ctrl[k].rx) * t, rz = ctrl[k].rz + (ctrl[k + 1].rz - ctrl[k].rz) * t;
      rings.push({ p, T, rx: Math.max(rx, 4e-4), rz: Math.max(rz, 4e-4), main: true });
    }
    function cap(r0, dir) {
      const out = [], capN = 6, R = (r0.rx + r0.rz) / 2 * (o.capScale || 1);
      for (let k = 1; k <= capN; k++) {
        const phi = k / capN * Math.PI / 2, c = Math.cos(phi);
        out.push({ p: r0.p.clone().addScaledVector(r0.T, dir * R * Math.sin(phi)), T: r0.T, rx: Math.max(r0.rx * c, 2e-4), rz: Math.max(r0.rz * c, 2e-4) });
      }
      return out;
    }
    let all = rings;
    if (o.capStart !== false) all = cap(rings[0], -1).reverse().concat(all);
    if (o.capEnd !== false) all = all.concat(cap(rings[rings.length - 1], 1));
    const pos = [], idx = [];
    for (const r of all) {
      const a = refv.clone().addScaledVector(r.T, -refv.dot(r.T));
      if (a.lengthSq() < 1e-8) a.set(0, 0, 1).addScaledVector(r.T, -r.T.z);
      a.normalize(); const b = new V3().crossVectors(r.T, a);
      r.a = a; r.b = b;
      for (let j = 0; j < radial; j++) {
        const th = j / radial * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
        pos.push(r.p.x + a.x * r.rx * c + b.x * r.rz * s, r.p.y + a.y * r.rx * c + b.y * r.rz * s, r.p.z + a.z * r.rx * c + b.z * r.rz * s);
      }
    }
    for (let i = 0; i < all.length - 1; i++) for (let j = 0; j < radial; j++) {
      const v0 = i * radial + j, v1 = i * radial + (j + 1) % radial, v2 = (i + 1) * radial + j, v3 = (i + 1) * radial + (j + 1) % radial;
      idx.push(v0, v1, v2, v1, v3, v2);
    }
    return { pos, idx, rings };
  }

  /* ---------- Pesos de skinning por envelope ---------- */
  const _ab = new V3(), _ap = new V3(), _q = new V3();
  function distSeg(p, s) {
    _ab.subVectors(s.b, s.a); const L2 = _ab.lengthSq();
    const t = L2 > 0 ? clamp(_ap.subVectors(p, s.a).dot(_ab) / L2, 0, 1) : 0;
    _q.copy(s.a).addScaledVector(_ab, t); return p.distanceTo(_q);
  }
  function weightsFor(p, cands, exp) {
    const arr = cands.map(n => [boneIndex[n], 1 / Math.pow(distSeg(p, SEG[n]) + 0.012, exp)]);
    arr.sort((x, y) => y[1] - x[1]);
    const top = arr.slice(0, 4); while (top.length < 4) top.push([0, 0]);
    const sum = top.reduce((a, x) => a + x[1], 0) || 1;
    return top.map(x => [x[0], x[1] / sum]);
  }
  const side = (list, p) => list.map(n => n.charAt(0) === '*' ? p + n.slice(1) : n);

  /* ---------- Cores ---------- */
  const COL = {
    deep: new THREE.Color(0x5a2420), wood: new THREE.Color(0xD6C2A4), bone: new THREE.Color(0xCBB8A2),
    idle: new THREE.Color(0xC4695A), pri: new THREE.Color(0xFF2D45), sec: new THREE.Color(0xFF9901), tend: new THREE.Color(0xE8DCC8)
  };

  /* ---------- Corpo-base ---------- */
  const baseParts = [];   // {pos, idx, rings, cands, exp, color(fn), surf:bool}
  function addBase(t, cands, color, surf, exp) { baseParts.push(Object.assign(t, { cands, color, surf: !!surf, exp: exp || 6 })); }
  const deep = () => COL.deep, wood = () => COL.wood;
  const torsoC = ['hips', 'spine', 'chest', 'upperChest', 'neck', 'leftShoulder', 'rightShoulder', 'leftUpperLeg', 'rightUpperLeg'];
  addBase(tube([
    { p: [0, 0.83, 0], rx: 0.07, rz: 0.06 }, { p: [0, 0.87, 0], rx: 0.14, rz: 0.085 },
    { p: [0, 0.93, -0.005], rx: 0.158, rz: 0.095 }, { p: [0, 0.99, 0], rx: 0.160, rz: 0.095 },
    { p: [0, 1.05, 0.005], rx: 0.147, rz: 0.087 }, { p: [0, 1.11, 0.005], rx: 0.134, rz: 0.082 },
    { p: [0, 1.19, 0.005], rx: 0.141, rz: 0.087 }, { p: [0, 1.27, 0.005], rx: 0.157, rz: 0.095 },
    { p: [0, 1.34, 0], rx: 0.168, rz: 0.100 }, { p: [0, 1.40, -0.005], rx: 0.172, rz: 0.095 },
    { p: [0, 1.445, -0.01], rx: 0.158, rz: 0.075 }, { p: [0, 1.48, -0.01], rx: 0.085, rz: 0.058 },
    { p: [0, 1.52, 0], rx: 0.052, rz: 0.050 }, { p: [0, 1.60, 0.008], rx: 0.046, rz: 0.046 }
  ], { radial: 64, segs: 150, capScale: 0.6 }), torsoC, deep, true);
  // cabeça oval (boneco articulável)
  {
    const ctrl = [], N = 22;
    for (let k = 0; k <= N; k++) {
      const phi = 0.03 * Math.PI + 0.94 * Math.PI * k / N, c = Math.cos(phi), sn = Math.sin(phi);
      const f = 1 - 0.09 * c;
      ctrl.push({ p: [0, 1.692 - 0.108 * c, 0.004 + 0.016 * c], rx: 0.072 * sn * f, rz: 0.090 * sn * f });
    }
    addBase(tube(ctrl, { radial: 40, segs: 60, capScale: 1 }), ['head', 'neck'], wood, false);
  }
  for (const [s, p] of SIDES) {
    // glúteo (volume das nádegas)
    addBase(tube([
      { p: [s * 0.072, 1.00, -0.05], rx: 0.055, rz: 0.035 }, { p: [s * 0.080, 0.94, -0.062], rx: 0.072, rz: 0.048 },
      { p: [s * 0.085, 0.88, -0.058], rx: 0.065, rz: 0.042 }, { p: [s * 0.088, 0.845, -0.045], rx: 0.045, rz: 0.028 }
    ], { radial: 36, segs: 30 }), side(['hips', '*UpperLeg'], p), deep, true);
    // braço
    addBase(tube([
      { p: [s * 0.175, 1.45, -0.01], rx: 0.048, rz: 0.048 }, { p: [s * 0.195, 1.37, -0.01], rx: 0.043, rz: 0.045 },
      { p: [s * 0.200, 1.25, -0.015], rx: 0.038, rz: 0.040 }, { p: [s * 0.200, 1.14, -0.02], rx: 0.032, rz: 0.033 },
      { p: [s * 0.205, 1.06, -0.012], rx: 0.035, rz: 0.031 }, { p: [s * 0.208, 0.96, -0.005], rx: 0.028, rz: 0.023 },
      { p: [s * 0.210, 0.88, 0], rx: 0.025, rz: 0.018 }
    ], { radial: 40, segs: 90 }), side(['*Shoulder', '*UpperArm', '*LowerArm', '*LowerArmTwist', '*Hand'], p),
      v => v.y < 0.93 ? COL.deep.clone().lerp(COL.wood, smooth(0.93, 0.895, v.y)) : COL.deep, true);
    // palma, eminência tenar, dedos (estilo boneco)
    addBase(tube([
      { p: [s * 0.21, 0.885, 0.002], rx: 0.030, rz: 0.018 }, { p: [s * 0.21, 0.845, 0.004], rx: 0.041, rz: 0.016 },
      { p: [s * 0.21, 0.795, 0.005], rx: 0.040, rz: 0.013 }
    ], { radial: 20, segs: 10, capScale: 0.5 }), side(['*LowerArmTwist', '*Hand'], p), wood, false, 7);
    addBase(tube([
      { p: [s * 0.222, 0.868, 0.012], rx: 0.012, rz: 0.012 }, { p: [s * 0.240, 0.838, 0.020], rx: 0.016, rz: 0.014 },
      { p: [s * 0.250, 0.825, 0.023], rx: 0.011, rz: 0.011 }
    ], { radial: 14, segs: 8 }), side(['*Hand', '*ThumbMetacarpal'], p), wood, false, 7);
    for (const f in FINGERS) {
      const F = FINGERS[f], names = PHAL.map(ph => p + f + ph);
      const pts = names.map(n => SEG[n].a.toArray()).concat([SEG[names[2]].b.toArray()]);
      addBase(tube(pts.map((q, i) => ({ p: q, rx: F.r * (1 - i * 0.07), rz: F.r * (1 - i * 0.07) * 0.92 })), { radial: 12, segs: 18 }),
        [p + 'Hand'].concat(names), wood, false, 8);
    }
    {
      const names = ['ThumbMetacarpal', 'ThumbProximal', 'ThumbDistal'].map(n => p + n);
      const pts = names.map(n => SEG[n].a.toArray()).concat([SEG[names[2]].b.toArray()]);
      addBase(tube(pts.map((q, i) => ({ p: q, rx: 0.0115 - i * 0.0008, rz: 0.0105 - i * 0.0008 })), { radial: 12, segs: 16 }),
        [p + 'Hand'].concat(names), wood, false, 8);
    }
    // perna
    addBase(tube([
      { p: [s * 0.095, 0.95, 0.0], rx: 0.075, rz: 0.080 }, { p: [s * 0.100, 0.86, 0.005], rx: 0.075, rz: 0.080 },
      { p: [s * 0.100, 0.72, 0.01], rx: 0.062, rz: 0.065 }, { p: [s * 0.097, 0.58, 0.015], rx: 0.047, rz: 0.049 },
      { p: [s * 0.095, 0.50, 0.015], rx: 0.041, rz: 0.043 }, { p: [s * 0.097, 0.40, 0.0], rx: 0.042, rz: 0.046 },
      { p: [s * 0.100, 0.26, -0.005], rx: 0.035, rz: 0.037 }, { p: [s * 0.100, 0.13, -0.008], rx: 0.026, rz: 0.028 },
      { p: [s * 0.100, 0.08, -0.01], rx: 0.026, rz: 0.028 }
    ], { radial: 44, segs: 120 }), side(['hips', '*UpperLeg', '*LowerLeg', '*Foot'], p),
      v => {
        if (v.y < 0.15) return COL.deep.clone().lerp(COL.wood, smooth(0.15, 0.11, v.y));
        // tíbia (face anteromedial) e patela aparentes, como nos atlas
        let b = 0;
        if (v.y > 0.14 && v.y < 0.52) b = smooth(-0.005, 0.015, v.z) * smooth(0.104, 0.092, v.x * s) * smooth(0.14, 0.18, v.y) * smooth(0.52, 0.48, v.y);
        if (v.y > 0.46 && v.y < 0.6) b = Math.max(b, smooth(0.028, 0.045, v.z) * smooth(0.6, 0.565, v.y) * smooth(0.46, 0.49, v.y));
        return COL.deep.clone().lerp(COL.bone, b);
      }, true);
    // pé + 5 dedos
    addBase(tube([
      { p: [s * 0.100, 0.035, -0.055], rx: 0.032, rz: 0.035 }, { p: [s * 0.100, 0.042, 0.0], rx: 0.038, rz: 0.042 },
      { p: [s * 0.103, 0.030, 0.08], rx: 0.045, rz: 0.030 }, { p: [s * 0.104, 0.022, 0.135], rx: 0.046, rz: 0.020 }
    ], { radial: 24, segs: 24, capScale: 0.6 }), side(['*LowerLeg', '*Foot', '*Toes'], p), wood, false, 7);
    const TOES = [[-0.027, 0.052, 0.0115], [-0.006, 0.042, 0.0088], [0.008, 0.038, 0.0082], [0.021, 0.034, 0.0077], [0.033, 0.028, 0.0072]];
    for (const [dx, len, r] of TOES) {
      const x = s * (0.104 + dx);
      addBase(tube([{ p: [x, 0.016, 0.13], rx: r, rz: r * 0.9 }, { p: [x, 0.015, 0.13 + len * 0.6], rx: r * 0.95, rz: r * 0.82 },
        { p: [x, 0.011, 0.13 + len], rx: r * 0.85, rz: r * 0.7 }], { radial: 12, segs: 8 }), side(['*Toes', '*Foot'], p), wood, false, 8);
    }
  }

  function buildSkinned(parts, material, extra) {
    let nV = 0; for (const pt of parts) nV += pt.pos.length / 3;
    const P = new Float32Array(nV * 3), SI = new Uint16Array(nV * 4), SW = new Float32Array(nV * 4), C = extra && extra.color ? new Float32Array(nV * 3) : null;
    const I = []; let off = 0; const tmp = new V3();
    for (const pt of parts) {
      const n = pt.pos.length / 3;
      for (let v = 0; v < n; v++) {
        tmp.set(pt.pos[v * 3], pt.pos[v * 3 + 1], pt.pos[v * 3 + 2]);
        const wp = pt.wpos ? tmp.clone().set(pt.wpos[v * 3], pt.wpos[v * 3 + 1], pt.wpos[v * 3 + 2]) : tmp;
        let w = weightsFor(wp, pt.cands, pt.exp || 6);
        if (pt.endBone) {
          const a = smooth(pt.endFrom, 1, pt.us[v]), ei = boneIndex[pt.endBone];
          const m = new Map(); for (const [bi, ww] of w) if (ww > 0) m.set(bi, (m.get(bi) || 0) + ww * (1 - a));
          m.set(ei, (m.get(ei) || 0) + a);
          w = [...m.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4); while (w.length < 4) w.push([0, 0]);
          const sm = w.reduce((q, x) => q + x[1], 0) || 1; w = w.map(x => [x[0], x[1] / sm]);
        }
        for (let k = 0; k < 4; k++) { SI[(off + v) * 4 + k] = w[k][0]; SW[(off + v) * 4 + k] = w[k][1]; }
        P[(off + v) * 3] = tmp.x; P[(off + v) * 3 + 1] = tmp.y; P[(off + v) * 3 + 2] = tmp.z;
        if (C) { const c = pt.color(tmp); C[(off + v) * 3] = c.r; C[(off + v) * 3 + 1] = c.g; C[(off + v) * 3 + 2] = c.b; }
      }
      if (pt.flip) for (let i = 0; i < pt.idx.length; i += 3) I.push(pt.idx[i] + off, pt.idx[i + 2] + off, pt.idx[i + 1] + off);
      else for (const i of pt.idx) I.push(i + off);
      off += n;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(SI, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4));
    if (C) geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
    if (extra && extra.attrs) for (const k in extra.attrs) geo.setAttribute(k, extra.attrs[k]);
    geo.setIndex(I); geo.computeVertexNormals();
    const mesh = new THREE.SkinnedMesh(geo, material);
    mesh.frustumCulled = false; rig.add(mesh); mesh.bind(skeleton);
    return mesh;
  }
  const baseMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0, skinning: true });
  const baseMesh = buildSkinned(baseParts, baseMat, { color: true });

  /* =====================================================================
   * 3. SUPERFÍCIE PARA MOLDAR OS MÚSCULOS
   *    Nuvem de pontos da pele-base (só a parte externa) + hash espacial.
   * ===================================================================== */
  const surfParts = baseParts.filter(p => p.surf);
  function insidePart(x, part) {
    let best = null, bd = Infinity;
    for (const r of part.rings) { if (!r.main) continue; const d = x.distanceToSquared(r.p); if (d < bd) { bd = d; best = r; } }
    if (!best) return false;
    const d = x.clone().sub(best.p);
    const along = d.dot(best.T); if (Math.abs(along) > 0.012) return false;
    const da = d.dot(best.a) / best.rx, db = d.dot(best.b) / best.rz;
    return da * da + db * db < 0.94;
  }
  const CELL = 0.025, cloudP = [], cloudN = [], grid = new Map();
  const ck = (x, y, z) => x + ',' + y + ',' + z;
  for (const part of surfParts) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(part.pos, 3)); g.setIndex(part.idx); g.computeVertexNormals();
    const pa = g.attributes.position, na = g.attributes.normal, v = new V3();
    for (let i = 0; i < pa.count; i++) {
      v.fromBufferAttribute(pa, i);
      let inside = false;
      for (const other of surfParts) if (other !== part && insidePart(v, other)) { inside = true; break; }
      if (inside) continue;
      const id = cloudP.length;
      cloudP.push(v.clone()); cloudN.push(new V3().fromBufferAttribute(na, i));
      const k = ck(Math.floor(v.x / CELL), Math.floor(v.y / CELL), Math.floor(v.z / CELL));
      (grid.get(k) || grid.set(k, []).get(k)).push(id);
    }
  }
  function nearest(p) {
    const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL), cz = Math.floor(p.z / CELL);
    for (let R = 1; R <= 4; R++) {
      let best = -1, bd = Infinity;
      for (let x = cx - R; x <= cx + R; x++) for (let y = cy - R; y <= cy + R; y++) for (let z = cz - R; z <= cz + R; z++) {
        const l = grid.get(ck(x, y, z)); if (!l) continue;
        for (const id of l) { const d = cloudP[id].distanceToSquared(p); if (d < bd) { bd = d; best = id; } }
      }
      if (best >= 0 && Math.sqrt(bd) < R * CELL) return best;
      if (best >= 0 && R === 4) return best;
    }
    return 0;
  }
  function project(p, outP, outN) {
    // média ponderada dos vizinhos mais próximos → superfície suave
    const id = nearest(p);
    const c0 = cloudP[id], n0 = cloudN[id];
    outN.copy(n0);
    outP.copy(p).addScaledVector(n0, -_ap.subVectors(p, c0).dot(n0));
    // refina com 2ª passada (normal no ponto já projetado)
    const id2 = nearest(outP); outN.copy(cloudN[id2]).add(n0).normalize();
    outP.addScaledVector(outN, -_ap.subVectors(outP, cloudP[id2]).dot(outN));
  }

  /* =====================================================================
   * 4. MÚSCULOS (lado esquerdo; o direito é espelhado)
   *    o = linha de origem, i = linha de inserção, m = linha do meio (opcional)
   *    T = espessura da barriga; ts/te = fração de tendão no início/fim
   * ===================================================================== */
  const INFO = {
    peitoral_maior: ['Peitoral maior', 'Peitoral', 'Tronco', 'Aproxima o braço do corpo e o gira para dentro; é o músculo de empurrar à frente.'],
    deltoide_anterior: ['Deltoide (parte clavicular)', 'Ombro da frente', 'Ombro', 'Levanta o braço à frente.'],
    deltoide_lateral: ['Deltoide (parte acromial)', 'Ombro lateral', 'Ombro', 'Afasta o braço do corpo pela lateral.'],
    deltoide_posterior: ['Deltoide (parte espinal)', 'Ombro de trás', 'Ombro', 'Leva o braço para trás.'],
    serratil_anterior: ['Serrátil anterior', 'Serrátil', 'Tronco', 'Projeta a escápula à frente e estabiliza o ombro ao empurrar.'],
    reto_abdome: ['Reto do abdome', 'Abdômen (tanquinho)', 'Tronco', 'Flexiona o tronco e protege a coluna.'],
    obliquo_externo: ['Oblíquo externo do abdome', 'Oblíquo', 'Tronco', 'Gira e inclina o tronco.'],
    latissimo_dorso: ['Latíssimo do dorso', 'Dorsal', 'Costas', 'Puxa o braço para baixo e para trás (puxadas e remadas).'],
    trapezio_desc: ['Trapézio (parte descendente)', 'Trapézio superior', 'Costas', 'Eleva os ombros (encolhimento).'],
    trapezio_transv: ['Trapézio (parte transversa)', 'Trapézio médio', 'Costas', 'Aproxima as escápulas.'],
    trapezio_asc: ['Trapézio (parte ascendente)', 'Trapézio inferior', 'Costas', 'Abaixa e estabiliza as escápulas.'],
    infraespinal: ['Infraespinal', 'Manguito rotador', 'Costas', 'Gira o braço para fora e protege o ombro.'],
    redondo_maior: ['Redondo maior', 'Redondo maior', 'Costas', 'Puxa o braço para baixo e o gira para dentro.'],
    eretor_espinha: ['Eretor da espinha', 'Lombar', 'Costas', 'Estende e sustenta a coluna.'],
    esternocleidomastoideo: ['Esternocleidomastóideo', 'Pescoço', 'Pescoço', 'Gira e inclina a cabeça.'],
    biceps_braquial: ['Bíceps braquial', 'Bíceps', 'Braço', 'Dobra o cotovelo e gira a palma para cima.'],
    braquial: ['Braquial', 'Braquial', 'Braço', 'Principal flexor do cotovelo, por baixo do bíceps.'],
    triceps_lateral: ['Tríceps braquial (cabeça lateral)', 'Tríceps', 'Braço', 'Estica o cotovelo.'],
    triceps_longa: ['Tríceps braquial (cabeça longa)', 'Tríceps', 'Braço', 'Estica o cotovelo e leva o braço para trás.'],
    braquiorradial: ['Braquiorradial', 'Antebraço', 'Antebraço', 'Dobra o cotovelo com a mão neutra (rosca martelo).'],
    flexores_antebraco: ['Flexores do carpo e dos dedos', 'Antebraço (parte interna)', 'Antebraço', 'Fecham a mão e dobram o punho: a força da pegada.'],
    extensores_antebraco: ['Extensores do carpo e dos dedos', 'Antebraço (parte externa)', 'Antebraço', 'Abrem a mão e estendem o punho.'],
    gluteo_maximo: ['Glúteo máximo', 'Glúteo', 'Quadril', 'Estende o quadril: subir, levantar e empurrar o corpo.'],
    gluteo_medio: ['Glúteo médio', 'Glúteo lateral', 'Quadril', 'Afasta a perna e mantém a pelve nivelada.'],
    iliopsoas: ['Iliopsoas e pectíneo', 'Flexores do quadril', 'Quadril', 'Dobram o quadril: levantar o joelho em direção ao peito.'],
    tensor_fascia_lata: ['Tensor da fáscia lata', 'TFL', 'Quadril', 'Flexiona e afasta o quadril.'],
    trato_iliotibial: ['Trato iliotibial', 'Banda IT', 'Coxa', 'Faixa de tecido que estabiliza a lateral do joelho.'],
    reto_femoral: ['Reto femoral', 'Quadríceps (centro)', 'Coxa', 'Estica o joelho e dobra o quadril.'],
    vasto_lateral: ['Vasto lateral', 'Quadríceps (lateral)', 'Coxa', 'Estica o joelho.'],
    vasto_medial: ['Vasto medial', 'Quadríceps (gota)', 'Coxa', 'Estica o joelho e estabiliza a patela.'],
    sartorio: ['Sartório', 'Sartório', 'Coxa', 'Dobra e gira a coxa (posição de alfaiate).'],
    adutores: ['Adutor longo e adutor magno', 'Adutores', 'Coxa', 'Aproximam as pernas.'],
    gracil: ['Grácil', 'Grácil (adutor)', 'Coxa', 'Aproxima a perna e ajuda a dobrar o joelho.'],
    biceps_femoral: ['Bíceps femoral', 'Posterior de coxa (lateral)', 'Coxa', 'Dobra o joelho e estende o quadril.'],
    semitendineo: ['Semitendíneo e semimembranáceo', 'Posterior de coxa (medial)', 'Coxa', 'Dobram o joelho e estendem o quadril.'],
    ligamento_patela: ['Ligamento da patela', 'Tendão patelar', 'Joelho', 'Liga a patela à tíbia e transmite a força do quadríceps.'],
    gastrocnemio_medial: ['Gastrocnêmio (cabeça medial)', 'Panturrilha', 'Perna', 'Eleva o calcanhar (ficar na ponta dos pés).'],
    gastrocnemio_lateral: ['Gastrocnêmio (cabeça lateral)', 'Panturrilha', 'Perna', 'Eleva o calcanhar (ficar na ponta dos pés).'],
    soleo: ['Sóleo', 'Panturrilha (sóleo)', 'Perna', 'Eleva o calcanhar, principalmente com o joelho dobrado.'],
    tendao_calcaneo: ['Tendão do calcâneo', 'Tendão de Aquiles', 'Perna', 'Liga a panturrilha ao calcanhar.'],
    tibial_anterior: ['Tibial anterior', 'Canela', 'Perna', 'Levanta a ponta do pé.'],
    fibular_longo: ['Fibular longo', 'Fibular', 'Perna', 'Vira a sola do pé para fora e estabiliza o tornozelo.'],
    extensor_dedos: ['Extensor longo dos dedos', 'Canela (lateral)', 'Perna', 'Levanta os dedos do pé.']
  };
  const ARM = ['*UpperArm', '*LowerArm'];
  const MDEF = [
    // ---------- tronco (frente)
    { k: 'peitoral_maior', o: [[0.105, 1.448, 0.075], [0.05, 1.44, 0.09], [0.016, 1.39, 0.104], [0.016, 1.31, 0.104], [0.035, 1.255, 0.1], [0.075, 1.245, 0.095]],
      i: [[0.183, 1.395, 0.035], [0.186, 1.385, 0.04], [0.19, 1.37, 0.04], [0.19, 1.36, 0.035], [0.188, 1.35, 0.03], [0.186, 1.345, 0.025]],
      m: [[0.15, 1.43, 0.08], [0.12, 1.415, 0.105], [0.10, 1.38, 0.118], [0.10, 1.33, 0.118], [0.11, 1.30, 0.11], [0.135, 1.29, 0.095]],
      T: 0.024, te: 0.07, nu: 30, nv: 20, cand: ['upperChest', 'chest', '*Shoulder'], end: '*UpperArm', endFrom: 0.82, layer: 1 },
    { k: 'serratil_anterior', o: [[0.125, 1.33, 0.075], [0.135, 1.27, 0.07], [0.135, 1.21, 0.06]], i: [[0.158, 1.35, -0.03], [0.16, 1.30, -0.04], [0.155, 1.25, -0.045]],
      T: 0.009, digit: 4, nu: 14, nv: 22, cand: ['chest', 'upperChest'], layer: 0 },
    { k: 'reto_abdome', o: [[0.004, 0.895, 0.085], [0.045, 0.9, 0.085]], m: [[0.004, 1.10, 0.096], [0.075, 1.10, 0.092]], i: [[0.004, 1.285, 0.103], [0.08, 1.285, 0.098]],
      T: 0.018, segs: [0.48, 0.66, 0.84], medialTendon: 0.12, nu: 46, nv: 12, cand: ['hips', 'spine', 'chest'], layer: 0,
      // um músculo só, em três porções (divididas nas linhas tendíneas), para mostrar onde o exercício concentra
      porcoes: [['inf', 0, 0.48], ['med', 0.48, 0.66], ['sup', 0.66, 1]] },
    { k: 'obliquo_externo', o: [[0.09, 1.255, 0.095], [0.128, 1.235, 0.072], [0.145, 1.17, 0.035], [0.148, 1.10, 0.0]],
      i: [[0.078, 1.17, 0.092], [0.08, 1.04, 0.09], [0.115, 0.975, 0.075], [0.150, 0.985, 0.015]],
      T: 0.014, te: 0.28, nu: 18, nv: 20, cand: ['hips', 'spine', 'chest'], layer: 0 },
    // ---------- ombro
    { k: 'deltoide_anterior', o: [[0.10, 1.452, 0.07], [0.155, 1.462, 0.045]], m: [[0.17, 1.40, 0.075], [0.215, 1.405, 0.045]], i: [[0.207, 1.30, 0.02], [0.214, 1.295, 0.012]],
      T: 0.024, te: 0.1, nu: 22, nv: 12, cand: ['*Shoulder', '*UpperArm', 'upperChest'], layer: 2 },
    { k: 'deltoide_lateral', o: [[0.155, 1.465, 0.04], [0.195, 1.462, -0.015]], m: [[0.225, 1.41, 0.04], [0.24, 1.40, -0.02]], i: [[0.214, 1.295, 0.012], [0.218, 1.295, -0.004]],
      T: 0.028, te: 0.1, nu: 22, nv: 12, cand: ['*Shoulder', '*UpperArm', 'upperChest'], layer: 2 },
    { k: 'deltoide_posterior', o: [[0.195, 1.462, -0.015], [0.12, 1.448, -0.075]], m: [[0.235, 1.40, -0.03], [0.19, 1.40, -0.075]], i: [[0.218, 1.295, -0.004], [0.214, 1.30, -0.018]],
      T: 0.022, te: 0.1, nu: 22, nv: 12, cand: ['*Shoulder', '*UpperArm', 'upperChest'], layer: 2 },
    // ---------- costas
    { k: 'trapezio_desc', o: [[0.004, 1.61, -0.045], [0.004, 1.50, -0.068]], i: [[0.115, 1.462, 0.03], [0.175, 1.468, -0.02]],
      T: 0.016, ts: 0.08, nu: 18, nv: 12, cand: ['neck', 'upperChest', '*Shoulder'], layer: 1 },
    { k: 'trapezio_transv', o: [[0.004, 1.50, -0.068], [0.004, 1.37, -0.098]], i: [[0.175, 1.465, -0.025], [0.115, 1.42, -0.088]],
      T: 0.014, ts: 0.16, nu: 18, nv: 12, cand: ['upperChest', 'chest', '*Shoulder'], layer: 1 },
    { k: 'trapezio_asc', o: [[0.004, 1.37, -0.098], [0.004, 1.19, -0.092]], i: [[0.115, 1.42, -0.088], [0.075, 1.40, -0.096]],
      T: 0.012, ts: 0.12, nu: 18, nv: 12, cand: ['upperChest', 'chest', 'spine'], layer: 1 },
    { k: 'infraespinal', o: [[0.072, 1.385, -0.1], [0.08, 1.30, -0.098]], i: [[0.178, 1.43, -0.04], [0.185, 1.40, -0.035]],
      T: 0.014, te: 0.12, nu: 16, nv: 12, cand: ['upperChest', 'chest', '*Shoulder'], end: '*UpperArm', endFrom: 0.72, layer: 0 },
    { k: 'redondo_maior', o: [[0.085, 1.29, -0.095], [0.10, 1.265, -0.09]], i: [[0.168, 1.385, -0.025], [0.175, 1.37, -0.015]],
      T: 0.016, te: 0.15, nu: 16, nv: 8, cand: ['chest', 'upperChest'], end: '*UpperArm', endFrom: 0.7, layer: 1 },
    { k: 'latissimo_dorso', o: [[0.06, 1.25, -0.098], [0.06, 1.12, -0.092], [0.065, 1.02, -0.09], [0.12, 0.985, -0.07]],
      m: [[0.115, 1.29, -0.1], [0.135, 1.22, -0.095], [0.15, 1.15, -0.07], [0.158, 1.08, -0.035]],
      i: [[0.165, 1.38, -0.025], [0.168, 1.375, -0.018], [0.17, 1.37, -0.01], [0.172, 1.365, -0.002]],
      T: 0.013, ts: 0.22, te: 0.08, nu: 28, nv: 18, cand: ['spine', 'chest', 'upperChest'], end: '*UpperArm', endFrom: 0.8, layer: 2 },
    { k: 'eretor_espinha', o: [[0.012, 0.97, -0.095], [0.055, 0.97, -0.088]], i: [[0.012, 1.32, -0.098], [0.045, 1.32, -0.098]],
      T: 0.022, ts: 0.12, nu: 26, nv: 8, cand: ['hips', 'spine', 'chest', 'upperChest'], layer: 0 },
    // ---------- pescoço
    { k: 'esternocleidomastoideo', o: [[0.012, 1.475, 0.06], [0.04, 1.478, 0.06]], i: [[0.052, 1.605, -0.008], [0.056, 1.60, -0.02]],
      T: 0.012, ts: 0.12, nu: 16, nv: 8, cand: ['neck', 'upperChest', 'head'], layer: 2 },
    // ---------- braço
    { k: 'biceps_braquial', o: [[0.188, 1.39, 0.03], [0.202, 1.385, 0.025]], m: [[0.192, 1.26, 0.052], [0.215, 1.26, 0.04]], i: [[0.205, 1.125, 0.022], [0.212, 1.12, 0.018]],
      T: 0.026, ts: 0.12, te: 0.16, nu: 26, nv: 12, cand: ARM, layer: 1 },
    { k: 'braquial', o: [[0.226, 1.27, 0.0], [0.23, 1.25, -0.012]], i: [[0.213, 1.125, 0.015], [0.218, 1.12, 0.004]],
      T: 0.012, te: 0.1, nu: 14, nv: 8, cand: ARM, layer: 0 },
    { k: 'triceps_lateral', o: [[0.212, 1.405, -0.03], [0.228, 1.33, -0.03]], m: [[0.228, 1.28, -0.045], [0.235, 1.25, -0.035]], i: [[0.208, 1.17, -0.052], [0.21, 1.145, -0.05]],
      T: 0.02, te: 0.28, nu: 22, nv: 10, cand: ARM, layer: 1 },
    { k: 'triceps_longa', o: [[0.175, 1.385, -0.055], [0.19, 1.37, -0.06]], m: [[0.183, 1.27, -0.062], [0.205, 1.27, -0.066]], i: [[0.197, 1.17, -0.055], [0.205, 1.145, -0.055]],
      T: 0.022, te: 0.28, nu: 22, nv: 10, cand: ARM, layer: 1 },
    { k: 'braquiorradial', o: [[0.228, 1.22, 0.0], [0.232, 1.18, 0.004]], m: [[0.232, 1.06, 0.015], [0.236, 1.06, 0.0]], i: [[0.226, 0.895, 0.006], [0.228, 0.895, -0.002]],
      T: 0.018, te: 0.4, nu: 26, nv: 8, cand: ['*LowerArm', '*LowerArmTwist', '*UpperArm'], layer: 1 },
    { k: 'flexores_antebraco', o: [[0.183, 1.13, 0.0], [0.19, 1.12, 0.02], [0.205, 1.115, 0.026]], m: [[0.186, 1.03, 0.012], [0.198, 1.03, 0.03], [0.215, 1.03, 0.03]],
      i: [[0.193, 0.895, 0.01], [0.205, 0.892, 0.019], [0.215, 0.892, 0.018]],
      T: 0.018, te: 0.4, nu: 26, nv: 14, cand: ['*LowerArm', '*LowerArmTwist', '*Hand'], layer: 0 },
    { k: 'extensores_antebraco', o: [[0.232, 1.15, -0.02], [0.226, 1.13, -0.04], [0.21, 1.12, -0.05]], m: [[0.228, 1.03, -0.025], [0.218, 1.03, -0.04], [0.198, 1.03, -0.035]],
      i: [[0.226, 0.89, -0.012], [0.212, 0.89, -0.018], [0.195, 0.893, -0.014]],
      T: 0.016, te: 0.4, nu: 26, nv: 14, cand: ['*LowerArm', '*LowerArmTwist', '*Hand'], layer: 0 },
    // ---------- quadril e coxa
    { k: 'gluteo_medio', o: [[0.07, 1.07, -0.085], [0.152, 1.045, 0.0]], i: [[0.165, 0.93, -0.035], [0.172, 0.935, 0.005]],
      T: 0.02, te: 0.1, pa: 0.35, nu: 16, nv: 12, cand: ['hips', '*UpperLeg'], layer: 0 },
    { k: 'gluteo_maximo', o: [[0.125, 1.045, -0.07], [0.05, 1.045, -0.1], [0.012, 0.97, -0.11], [0.02, 0.875, -0.1]],
      m: [[0.135, 0.98, -0.1], [0.10, 0.955, -0.125], [0.07, 0.905, -0.125], [0.06, 0.855, -0.1]],
      i: [[0.168, 0.915, -0.035], [0.162, 0.875, -0.04], [0.155, 0.83, -0.04], [0.145, 0.79, -0.035]],
      T: 0.026, te: 0.16, pa: 0.3, pb: 0.45, nu: 30, nv: 22, cand: ['hips', '*UpperLeg'], layer: 1 },
    { k: 'iliopsoas', o: [[0.07, 0.95, 0.088], [0.125, 0.985, 0.07]], i: [[0.04, 0.85, 0.055], [0.085, 0.86, 0.07]],
      T: 0.016, te: 0.1, nu: 14, nv: 10, cand: ['hips', '*UpperLeg'], layer: 0 },
    { k: 'tensor_fascia_lata', o: [[0.135, 1.005, 0.06], [0.15, 1.0, 0.035]], i: [[0.16, 0.89, 0.035], [0.168, 0.895, 0.015]],
      T: 0.016, nu: 14, nv: 8, cand: ['hips', '*UpperLeg'], layer: 1 },
    { k: 'trato_iliotibial', o: [[0.168, 0.915, 0.012], [0.17, 0.91, -0.025]], i: [[0.138, 0.52, 0.012], [0.14, 0.52, -0.012]],
      T: 0.004, tendon: true, nu: 30, nv: 6, cand: ['*UpperLeg', '*LowerLeg', 'hips'], layer: 1 },
    { k: 'vasto_lateral', o: [[0.16, 0.90, 0.03], [0.165, 0.885, -0.025]], m: [[0.165, 0.71, 0.05], [0.172, 0.71, -0.01]], i: [[0.125, 0.555, 0.05], [0.135, 0.56, 0.03]],
      T: 0.03, te: 0.12, nu: 26, nv: 12, cand: ['*UpperLeg', '*LowerLeg', 'hips'], layer: 0 },
    { k: 'reto_femoral', o: [[0.105, 0.925, 0.075], [0.12, 0.925, 0.07]], m: [[0.095, 0.73, 0.087], [0.125, 0.73, 0.08]], i: [[0.098, 0.56, 0.058], [0.112, 0.56, 0.056]],
      T: 0.03, ts: 0.08, te: 0.12, nu: 28, nv: 10, cand: ['*UpperLeg', '*LowerLeg', 'hips'], layer: 1 },
    { k: 'vasto_medial', o: [[0.06, 0.76, 0.045], [0.048, 0.73, 0.005]], m: [[0.06, 0.63, 0.065], [0.045, 0.62, 0.03]], i: [[0.088, 0.555, 0.055], [0.08, 0.555, 0.04]],
      T: 0.032, te: 0.1, nu: 20, nv: 10, cand: ['*UpperLeg', '*LowerLeg'], layer: 0 },
    { k: 'sartorio', o: [[0.13, 1.0, 0.07], [0.142, 0.995, 0.06]], m: [[0.06, 0.75, 0.06], [0.07, 0.75, 0.065]], i: [[0.05, 0.52, -0.01], [0.055, 0.515, -0.0]],
      T: 0.009, te: 0.1, nu: 36, nv: 6, cand: ['hips', '*UpperLeg', '*LowerLeg'], layer: 2 },
    { k: 'adutores', o: [[0.03, 0.885, 0.05], [0.025, 0.87, 0.0]], i: [[0.07, 0.68, 0.035], [0.055, 0.64, -0.015]],
      T: 0.022, nu: 20, nv: 10, cand: ['hips', '*UpperLeg'], layer: 0 },
    { k: 'adutores', o: [[0.03, 0.865, -0.03], [0.055, 0.865, -0.085]], i: [[0.06, 0.62, -0.035], [0.075, 0.62, -0.05]],
      T: 0.018, te: 0.1, nu: 20, nv: 8, cand: ['hips', '*UpperLeg'], layer: 0 },
    { k: 'gracil', o: [[0.022, 0.87, -0.005], [0.03, 0.865, -0.03]], i: [[0.055, 0.53, -0.025], [0.06, 0.525, -0.035]],
      T: 0.01, te: 0.12, nu: 28, nv: 6, cand: ['hips', '*UpperLeg', '*LowerLeg'], layer: 1 },
    { k: 'biceps_femoral', o: [[0.085, 0.87, -0.095], [0.10, 0.865, -0.09]], m: [[0.12, 0.70, -0.075], [0.15, 0.70, -0.045]], i: [[0.135, 0.52, -0.035], [0.14, 0.52, -0.025]],
      T: 0.024, ts: 0.06, te: 0.14, nu: 26, nv: 10, cand: ['hips', '*UpperLeg', '*LowerLeg'], layer: 0 },
    { k: 'semitendineo', o: [[0.06, 0.87, -0.095], [0.085, 0.87, -0.095]], m: [[0.06, 0.70, -0.075], [0.095, 0.70, -0.08]], i: [[0.065, 0.525, -0.035], [0.075, 0.52, -0.04]],
      T: 0.024, ts: 0.06, te: 0.16, nu: 26, nv: 10, cand: ['hips', '*UpperLeg', '*LowerLeg'], layer: 0 },
    { k: 'ligamento_patela', o: [[0.093, 0.56, 0.057], [0.117, 0.56, 0.055]], i: [[0.1, 0.44, 0.043], [0.112, 0.44, 0.042]],
      T: 0.012, tendon: true, nu: 12, nv: 8, cand: ['*LowerLeg', '*UpperLeg'], layer: 0 },
    // ---------- perna
    { k: 'gastrocnemio_medial', o: [[0.072, 0.535, -0.03], [0.095, 0.53, -0.045]], m: [[0.066, 0.40, -0.06], [0.095, 0.40, -0.085]], i: [[0.093, 0.235, -0.048], [0.1, 0.235, -0.05]],
      T: 0.03, te: 0.18, nu: 26, nv: 10, cand: ['*LowerLeg', '*UpperLeg', '*Foot'], layer: 1 },
    { k: 'gastrocnemio_lateral', o: [[0.105, 0.53, -0.045], [0.132, 0.525, -0.025]], m: [[0.108, 0.415, -0.085], [0.14, 0.415, -0.05]], i: [[0.102, 0.235, -0.05], [0.11, 0.235, -0.046]],
      T: 0.026, te: 0.2, nu: 26, nv: 10, cand: ['*LowerLeg', '*UpperLeg', '*Foot'], layer: 1 },
    { k: 'soleo', o: [[0.062, 0.42, -0.02], [0.142, 0.42, -0.012]], m: [[0.058, 0.30, -0.035], [0.145, 0.30, -0.02]], i: [[0.092, 0.17, -0.04], [0.112, 0.17, -0.038]],
      T: 0.014, te: 0.12, nu: 20, nv: 14, cand: ['*LowerLeg', '*Foot'], layer: 0 },
    { k: 'tendao_calcaneo', o: [[0.094, 0.25, -0.05], [0.108, 0.25, -0.048]], i: [[0.096, 0.055, -0.062], [0.106, 0.055, -0.062]],
      T: 0.008, tendon: true, nu: 18, nv: 6, cand: ['*LowerLeg', '*Foot'], layer: 2 },
    { k: 'tibial_anterior', o: [[0.105, 0.47, 0.044], [0.133, 0.465, 0.022]], m: [[0.104, 0.30, 0.045], [0.128, 0.30, 0.027]], i: [[0.088, 0.085, 0.05], [0.094, 0.082, 0.05]],
      T: 0.02, te: 0.35, nu: 26, nv: 8, cand: ['*LowerLeg', '*Foot'], layer: 0 },
    { k: 'extensor_dedos', o: [[0.134, 0.45, 0.02], [0.143, 0.45, 0.0]], i: [[0.11, 0.085, 0.05], [0.122, 0.085, 0.04]],
      T: 0.012, te: 0.35, nu: 24, nv: 6, cand: ['*LowerLeg', '*Foot'], layer: 1 },
    { k: 'fibular_longo', o: [[0.143, 0.48, 0.0], [0.146, 0.47, -0.02]], i: [[0.13, 0.085, -0.025], [0.13, 0.085, -0.035]],
      T: 0.014, te: 0.4, nu: 24, nv: 8, cand: ['*LowerLeg', '*Foot'], layer: 0 }
  ];

  function polyAt(line, v) {
    if (line.length === 1) return new V3().fromArray(line[0]);
    const f = v * (line.length - 1), k = Math.min(line.length - 2, Math.floor(f)), t = f - k;
    return new V3().fromArray(line[k]).lerp(new V3().fromArray(line[k + 1]), t);
  }

  const INST = [];          // instâncias (músculo + lado)
  const BYKEY = {};         // chave → [índices de instância]
  const muscleParts = [];
  const mA = [], mB = [];   // atributos aM (vec4) e aBulge
  for (const md of MDEF) {
    for (const [s, p] of SIDES) {
      const mir = q => [q[0] * s, q[1], q[2]];
      const o = md.o.map(mir), il = md.i.map(mir), ml = md.m ? md.m.map(mir) : null;
      const nu = md.nu || 24, nv = md.nv || 10;
      const pos = [], wpos = [], us = [], mAv = [], mBv = [];
      const S = new V3(), N = new V3();
      const raw = [];
      for (let iu = 0; iu <= nu; iu++) {
        const u = iu / nu, row = [];
        for (let iv = 0; iv <= nv; iv++) {
          const v = iv / nv;
          const O = polyAt(o, v), I = polyAt(il, v);
          let P;
          if (ml) {
            const M = polyAt(ml, v), C = M.clone().multiplyScalar(2).sub(O.clone().add(I).multiplyScalar(0.5));
            const a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
            P = O.clone().multiplyScalar(a).addScaledVector(C, b).addScaledVector(I, c);
          } else P = O.clone().lerp(I, u);
          project(P, S, N);
          row.push({ S: S.clone(), N: N.clone() });
        }
        raw.push(row);
      }
      for (let iu = 0; iu <= nu; iu++) {
        const u = iu / nu, row = raw[iu];
        const width = row[0].S.distanceTo(row[nv].S);
        // perfil ao longo da fibra
        const ts = md.ts || 0, te = md.te || 0;
        let tend = 0;
        if (ts > 0) tend = Math.max(tend, 1 - smooth(ts - 0.04, ts + 0.04, u));
        if (te > 0) tend = Math.max(tend, smooth(1 - te - 0.04, 1 - te + 0.04, u));
        const bb = clamp((u - ts) / Math.max(1 - ts - te, 0.01), 0, 1);
        const bell = Math.pow(Math.sin(Math.PI * bb), md.pb || 0.6);
        let along = Math.max(bell, 0.15) * (1 - tend) + 0.13 * tend;
        if (md.segs) {
          let g = 0; for (const su of md.segs) g = Math.max(g, Math.exp(-Math.pow((u - su) / 0.02, 2)));
          along *= 1 - 0.75 * g; tend = Math.max(tend, 0.75 * g);
        }
        if (md.tendon) { along = 1; tend = 1; }
        for (let iv = 0; iv <= nv; iv++) {
          const v = iv / nv;
          let across = Math.pow(Math.sin(Math.PI * v), md.pa || 0.55);
          let tv = tend;
          if (md.digit) across *= 0.35 + 0.65 * Math.pow(Math.abs(Math.sin(Math.PI * v * md.digit)), 0.7);
          if (md.medialTendon) tv = Math.max(tv, 1 - smooth(md.medialTendon * 0.5, md.medialTendon, v));
          const th = md.T * along * across;
          const off = 0.0016 + (md.layer || 0) * 0.0032 + th;
          const r = row[iv];
          pos.push(r.S.x + r.N.x * off, r.S.y + r.N.y * off, r.S.z + r.N.z * off);
          wpos.push(r.S.x, r.S.y, r.S.z); us.push(u);
          mAv.push(v * width / 0.0042, tv, across);
          mBv.push(md.tendon ? 0 : md.T * 0.55 * bell * across * (1 - tv));
        }
      }
      const W = nv + 1;
      // cada porção vira uma peça própria (mesmo músculo); a linha da divisão aparece nas duas, sem fresta
      const porcoes = md.porcoes || [[null, 0, 1]];
      for (const [reg, u0, u1] of porcoes) {
        const r0 = Math.round(u0 * nu), r1 = Math.round(u1 * nu);
        const id = INST.length;
        INST.push({ k: md.k, side: p, reg });
        (BYKEY[md.k] = BYKEY[md.k] || []).push(id);
        const ppos = [], pwpos = [], pus = [], idx = [];
        for (let iu = r0; iu <= r1; iu++) for (let iv = 0; iv <= nv; iv++) {
          const q = iu * W + iv;
          ppos.push(pos[q * 3], pos[q * 3 + 1], pos[q * 3 + 2]); pwpos.push(wpos[q * 3], wpos[q * 3 + 1], wpos[q * 3 + 2]); pus.push(us[q]);
          mA.push(id, mAv[q * 3], mAv[q * 3 + 1], mAv[q * 3 + 2]); mB.push(mBv[q]);
        }
        for (let iu = 0; iu < r1 - r0; iu++) for (let iv = 0; iv < nv; iv++) {
          const a = iu * W + iv, b = a + 1, c = a + W, d = c + 1;
          idx.push(a, c, b, b, c, d);
        }
        // orientação: garante que a face aponta para fora (normal da pele)
        const p0 = new V3(ppos[0], ppos[1], ppos[2]), pA = new V3(ppos[3 * W], ppos[3 * W + 1], ppos[3 * W + 2]), pB = new V3(ppos[3], ppos[4], ppos[5]);
        const fn = new V3().crossVectors(pA.sub(p0), pB.sub(p0));
        const flip = fn.dot(raw[r0][0].N) < 0;
        muscleParts.push({ pos: ppos, wpos: pwpos, idx, us: pus, cands: side(md.cand, p), exp: 6, flip, endBone: md.end ? side([md.end], p)[0] : null, endFrom: md.endFrom || 0.8 });
      }
    }
  }
  const NM = INST.length;
  const stateData = new Uint8Array(NM * 4);
  const stateTex = new THREE.DataTexture(stateData, NM, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
  stateTex.needsUpdate = true;
  const muscleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0, skinning: true });
  muscleMat.onBeforeCompile = sh => {
    sh.uniforms.uStateTex = { value: stateTex };
    sh.uniforms.uN = { value: NM };
    sh.uniforms.uIdle = { value: COL.idle }; sh.uniforms.uPri = { value: COL.pri };
    sh.uniforms.uSec = { value: COL.sec }; sh.uniforms.uTend = { value: COL.tend };
    sh.vertexShader = 'attribute vec4 aM;\nattribute float aBulge;\nuniform sampler2D uStateTex;\nuniform float uN;\nvarying vec3 vM;\nvarying vec4 vS;\n' +
      sh.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\nvS = texture2D(uStateTex, vec2((aM.x + 0.5) / uN, 0.5));\ntransformed += normal * aBulge * vS.y;\nvM = aM.yzw;');
    sh.fragmentShader = 'uniform vec3 uIdle;\nuniform vec3 uPri;\nuniform vec3 uSec;\nuniform vec3 uTend;\nvarying vec3 vM;\nvarying vec4 vS;\n' +
      sh.fragmentShader
        .replace('vec4 diffuseColor = vec4( diffuse, opacity );', [
          'float st = abs(fract(vM.x) - 0.5) * 2.0;',
          'float fib = mix(1.0, 0.78, smoothstep(0.55, 1.0, st));',
          'vec3 col = mix(uIdle, uSec, vS.z);',
          'col = mix(col, uPri, vS.x);',
          'col *= fib;',
          'col *= mix(0.55, 1.0, smoothstep(0.0, 0.5, vM.z));',
          'vec3 tc = uTend * mix(1.0, 0.9, smoothstep(0.6, 1.0, st));',
          'col = mix(col, tc, clamp(vM.y, 0.0, 1.0));',
          'float gr = dot(col, vec3(0.3, 0.55, 0.15));',
          'col = mix(col, vec3(gr) * vec3(0.55, 0.47, 0.47), vS.w);',
          'vec4 diffuseColor = vec4(col, opacity);'].join('\n'))
        .replace('vec3 totalEmissiveRadiance = emissive;',
          'vec3 totalEmissiveRadiance = emissive + (uPri * 0.32 * vS.x + uSec * 0.16 * vS.z) * (1.0 - clamp(vM.y, 0.0, 1.0));');
  };
  const muscleMesh = buildSkinned(muscleParts, muscleMat, {
    attrs: { aM: new THREE.Float32BufferAttribute(mA, 4), aBulge: new THREE.Float32BufferAttribute(mB, 1) }
  });

  /* ---------- Pontos de contato ---------- */
  function marker(bone, world) { const o = new THREE.Object3D(); const h = SEG[bone].a; o.position.set(world[0] - h.x, world[1] - h.y, world[2] - h.z); bones[bone].add(o); return o; }
  const CONTACT = { feet: [], hands: [] };
  for (const [s, p] of SIDES) {
    CONTACT.feet.push(marker(p + 'Foot', [s * 0.10, 0.0, -0.055]));
    CONTACT.feet.push(marker(p + 'Toes', [s * 0.105, 0.0, 0.135]));
    CONTACT.feet.push(marker(p + 'Toes', [s * 0.078, 0.004, 0.18]));
    CONTACT.hands.push(marker(p + 'Hand', [s * 0.21, 0.825, 0.018]));
    CONTACT.hands.push(marker(p + 'Hand', [s * 0.21, 0.792, 0.016]));
  }
  const ALL_CONTACTS = CONTACT.feet.concat(CONTACT.hands);
  // pontos do corpo que podem encostar no chão (deitado, ajoelhado, de lado, prancha)
  const GR = { pes: [], maos: [], joelhos: [], antebracos: [], quadril: [], costas: [], frente: [], lado: [], ladoE: [], ladoD: [], antebracosE: [], antebracosD: [], pesLadoE: [], pesLadoD: [] };
  {
    const M = (g, bone, w) => { const o = marker(bone, w); GR[g].push(o); return o; };
    M('costas', 'head', [0, 1.69, -0.105]); M('costas', 'chest', [0, 1.22, -0.105]); M('costas', 'spine', [0, 1.08, -0.095]);
    M('quadril', 'hips', [0, 0.97, -0.115]);
    M('frente', 'head', [0, 1.70, 0.10]); M('frente', 'upperChest', [0, 1.33, 0.13]); M('frente', 'spine', [0, 1.08, 0.115]); M('frente', 'hips', [0, 0.90, 0.10]);
    for (const [s, p] of SIDES) {
      M('costas', 'upperChest', [s * 0.08, 1.38, -0.115]); M('costas', 'chest', [s * 0.07, 1.22, -0.10]);
      M('quadril', 'hips', [s * 0.085, 0.92, -0.145]); M('quadril', 'hips', [s * 0.08, 0.86, -0.10]);
      M('frente', p + 'UpperLeg', [s * 0.10, 0.72, 0.095]); M('frente', 'upperChest', [s * 0.10, 1.35, 0.12]);
      M('joelhos', p + 'LowerLeg', [s * 0.095, 0.50, 0.065]); M('joelhos', p + 'LowerLeg', [s * 0.097, 0.30, 0.05]);
      M('pes', p + 'Foot', [s * 0.10, 0.04, -0.075]); M('pes', p + 'Foot', [s * 0.10, 0.065, 0.06]); M('pes', p + 'Toes', [s * 0.105, 0.035, 0.16]);
      const AB = s > 0 ? 'antebracosE' : 'antebracosD';
      for (const [bn, w] of [['LowerArm', [0.20, 1.13, -0.06]], ['LowerArm', [0.205, 1.07, -0.04]], ['LowerArm', [0.205, 1.07, 0.03]], ['LowerArm', [0.235, 1.07, -0.005]], ['LowerArmTwist', [0.21, 0.95, 0.025]], ['LowerArmTwist', [0.21, 0.95, -0.03]], ['LowerArmTwist', [0.232, 0.95, 0.0]]]) {
        const o = M('antebracos', p + bn, [s * w[0], w[1], w[2]]); GR[AB].push(o);
      }
      M('maos', p + 'Hand', [s * 0.21, 0.83, -0.012]);
      const L = s > 0 ? 'ladoE' : 'ladoD';
      for (const [bn, w] of [['UpperArm', [0.25, 1.40, -0.01]], ['UpperArm', [0.245, 1.27, -0.01]], ['UpperLeg', [0.17, 0.75, 0.0]], ['LowerLeg', [0.145, 0.50, 0.01]], ['Foot', [0.138, 0.06, -0.01]], ['Foot', [0.14, 0.03, 0.08]]]) {
        const o = marker(p + bn, [s * w[0], w[1], w[2]]); GR[L].push(o); GR.lado.push(o);
        if (bn === 'Foot') GR[s > 0 ? 'pesLadoE' : 'pesLadoD'].push(o);
      }
      const oq = marker('hips', [s * 0.175, 0.94, 0]); GR[L].push(oq); GR.lado.push(oq);
    }
    GR.pes.push(...CONTACT.feet); GR.maos.push(...CONTACT.hands);
    GR.pivoPes = [CONTACT.feet[1], CONTACT.feet[2], CONTACT.feet[4], CONTACT.feet[5]];
    GR.pivoJoelhos = GR.joelhos.slice();
  }
  const ALL_BODY = [].concat(GR.pes, GR.maos, GR.joelhos, GR.antebracos, GR.quadril, GR.costas, GR.frente, GR.lado);
  const avgPos = l => { const v = new V3(); for (const o of l) v.add(o.getWorldPosition(new V3())); return v.multiplyScalar(1 / l.length); };

  /* ---------- Acessórios: halteres (um em cada mão), halter único e anilha ---------- */
  const mPlate = new THREE.MeshStandardMaterial({ color: 0x2b2630, roughness: 0.42, metalness: 0.3 });
  const mBar = new THREE.MeshStandardMaterial({ color: 0xa8a2b0, roughness: 0.25, metalness: 0.7 });
  function makeDumbbell() {
    const g = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.15, 14), mBar); bar.rotation.z = Math.PI / 2; g.add(bar);
    for (const k of [-1, 1]) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.03, 24), mPlate); pl.rotation.z = Math.PI / 2; pl.position.x = k * 0.062; g.add(pl); }
    return g;
  }
  const dumbbells = [];
  for (const [s, p] of SIDES) {
    const g = makeDumbbell();
    const h = SEG[p + 'Hand'].a; g.position.set(s * 0.21 - h.x, 0.805 - h.y, 0.028 - h.z); g.visible = false;
    bones[p + 'Hand'].add(g); dumbbells.push(g);
  }
  // halter único segurado com as duas mãos (na vertical)
  const halter1 = new THREE.Group();
  { const d = makeDumbbell(); d.rotation.z = Math.PI / 2; halter1.add(d); }
  halter1.visible = false; scene.add(halter1);
  // anilha (eixo do cilindro = normal da anilha)
  const anilha = new THREE.Group();
  {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.028, 48), mPlate); anilha.add(disc);
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.008, 8, 48), mPlate); aro.rotation.x = Math.PI / 2; aro.position.y = 0.016; anilha.add(aro);
    const aro2 = aro.clone(); aro2.position.y = -0.016; anilha.add(aro2);
    const miolo = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.034, 24), mBar); anilha.add(miolo);
  }
  anilha.visible = false; scene.add(anilha);
  // barra reta e barra W (eixo da barra = x local)
  function makeBarra(w) {
    const g = new THREE.Group();
    let bar;
    if (w) {
      const pts = [[-0.62, 0, 0], [-0.22, 0, 0], [-0.16, 0, 0.028], [-0.09, 0, -0.022], [-0.03, 0, 0.012], [0.03, 0, 0.012], [0.09, 0, -0.022], [0.16, 0, 0.028], [0.22, 0, 0], [0.62, 0, 0]].map(q => new V3(...q));
      bar = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 80, 0.013, 10, false), mBar);
    } else {
      bar = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.5, 14), mBar); bar.rotation.z = Math.PI / 2;
    }
    g.add(bar);
    const r = w ? 0.11 : 0.17, x0 = w ? 0.47 : 0.6;
    for (const k of [-1, 1]) {
      const pl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.045, 40), mPlate); pl.rotation.z = Math.PI / 2; pl.position.x = k * x0; g.add(pl);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.04, 16), mBar); col.rotation.z = Math.PI / 2; col.position.x = k * (x0 - 0.045); g.add(col);
    }
    g.visible = false; scene.add(g);
    return g;
  }
  const barra = makeBarra(false), barraW = makeBarra(true);
  // caneleiras (tornozelo e punho)
  const mCan = new THREE.MeshStandardMaterial({ color: 0x642A90, roughness: 0.6, metalness: 0 });
  const mCan2 = new THREE.MeshStandardMaterial({ color: 0x3d1a58, roughness: 0.6, metalness: 0 });
  function makeCaneleira(raio) {
    const g = new THREE.Group();
    const corpo = new THREE.Mesh(new THREE.CylinderGeometry(raio, raio, 0.075, 28, 1, true), mCan); corpo.material.side = THREE.DoubleSide; g.add(corpo);
    const tira = new THREE.Mesh(new THREE.TorusGeometry(raio + 0.002, 0.005, 8, 28), mCan2); tira.rotation.x = Math.PI / 2; g.add(tira);
    for (const k of [-1, 1]) { const b = new THREE.Mesh(new THREE.TorusGeometry(raio, 0.009, 8, 28), mCan); b.rotation.x = Math.PI / 2; b.position.y = k * 0.034; g.add(b); }
    g.visible = false; return g;
  }
  const caneleiras = [], caneleirasPunho = [];
  for (const [, p] of SIDES) {
    const c = makeCaneleira(0.036); const pa = SEG[p + 'LowerLeg'].a, pf = SEG[p + 'Foot'].a;
    c.position.set(pf.x - pa.x, pf.y - pa.y + 0.075, pf.z - pa.z); bones[p + 'LowerLeg'].add(c); caneleiras.push(c);
    const w = makeCaneleira(0.03); const ta = SEG[p + 'LowerArmTwist'].a, ha = SEG[p + 'Hand'].a;
    w.position.set(ha.x - ta.x, ha.y - ta.y + 0.05, ha.z - ta.z); bones[p + 'LowerArmTwist'].add(w); caneleirasPunho.push(w);
  }
  let pesoCaneleira = 1;
  function escalaCaneleira(kg) { const e = kg >= 5 ? 1.32 : kg >= 3 ? 1.16 : 1; for (const c of caneleiras.concat(caneleirasPunho)) c.scale.set(e, 1, e); }
  // garrafas (calistenia): ficam paradas no chão
  const garrafas = [];
  {
    const mG = new THREE.MeshStandardMaterial({ color: 0x8fc3e6, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.6 });
    const mT = new THREE.MeshStandardMaterial({ color: 0x2f6fb0, roughness: 0.4 });
    const perfil = [[0, 0], [0.038, 0], [0.04, 0.01], [0.04, 0.135], [0.03, 0.17], [0.015, 0.19], [0.014, 0.205], [0, 0.205]].map(q => new THREE.Vector2(q[0], q[1]));
    for (let i = 0; i < 2; i++) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.LatheGeometry(perfil, 28), mG));
      const tampa = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.02, 16), mT); tampa.position.y = 0.212; g.add(tampa);
      g.visible = false; scene.add(g); garrafas.push(g);
    }
  }
  const PROPS = [...dumbbells, halter1, anilha, barra, barraW, ...caneleiras, ...caneleirasPunho, ...garrafas];

  /* =====================================================================
   * 5. EXERCÍCIOS — dados em exercicios.js (pose A → pose B, graus [x,y,z])
   * ===================================================================== */
  function both(name, v) { const o = {}; o['left' + name] = v; o['right' + name] = [v[0], -v[1], -v[2]]; return o; }
  function grip(a, b, c, t) {
    const o = {};
    for (const [, p] of SIDES) {
      for (const f in FINGERS) { o[p + f + 'Proximal'] = [a, 0, 0]; o[p + f + 'Intermediate'] = [b, 0, 0]; o[p + f + 'Distal'] = [c, 0, 0]; }
      o[p + 'ThumbMetacarpal'] = [t * 0.4, 0, 0]; o[p + 'ThumbProximal'] = [t, 0, 0]; o[p + 'ThumbDistal'] = [t, 0, 0];
    }
    return o;
  }
  const relaxed = grip(-8, -12, -6, -8), fist = grip(-80, -95, -55, -45), flat = grip(-4, -4, -2, 0);
  const G = {
    quadriceps: ['reto_femoral', 'vasto_lateral', 'vasto_medial'], triceps: ['triceps_lateral', 'triceps_longa'],
    isquios: ['biceps_femoral', 'semitendineo'], gastro: ['gastrocnemio_medial', 'gastrocnemio_lateral'],
    deltoides: ['deltoide_anterior', 'deltoide_lateral', 'deltoide_posterior'], trapezio: ['trapezio_desc', 'trapezio_transv', 'trapezio_asc']
  };
  const EXERCICIOS = window.CORPO3D_EXERCICIOS({ both, grip, relaxed, fist, flat, G });
  /* Reto do abdome: o músculo inteiro trabalha, mas a parte mais perto do que se move puxa mais
   * (pernas subindo → porção inferior; tronco subindo → porção superior). Os níveis são moderados,
   * porque as pesquisas mostram concentração, não isolamento. Sem foco = músculo inteiro por igual. */
  const PORCAO_NOME = { inf: 'inferior', med: 'média', sup: 'superior' };
  const ABD_PESOS = {
    inf: { inf: 1, med: 0.65, sup: 0.4 },
    sup: { sup: 1, med: 0.65, inf: 0.4 },
    supmed: { sup: 1, med: 0.85, inf: 0.45 },
    med: { med: 1, sup: 0.65, inf: 0.65 }
  };
  const ABD_FOCO = {
    abdominal: 'sup', toque_pes: 'sup', abdominal_completo: 'supmed',
    elevacao_pernas: 'inf', tesoura: 'inf', dead_bug: 'inf', escalador: 'inf', joelho_peito_4apoios: 'inf',
    ziguezague_garrafas: 'inf', abre_fecha_garrafas: 'inf', passagem_garrafa: 'inf', chutes_garrafa: 'inf',
    marcha_joelho: 'inf', elevacao_perna_frontal: 'inf', elevacao_perna_deitado: 'inf',
    bicicleta: 'med', canivete: 'med', canoa: 'med', rotacao_russa: 'med', prancha: 'med', toque_ombro: 'med',
    urso: 'med', perdigueiro_toque: 'med', rolamento_ajoelhado: 'med'
  };
  for (const e of EXERCICIOS) if (ABD_FOCO[e.id] && (e.prim.includes('reto_abdome') || e.sec.includes('reto_abdome'))) e.abd = ABD_FOCO[e.id];
  // texto da porção em foco: "inferior", "superior", "superior e média", "média"
  const focoAbdTxt = ex => ex && ex.abd ? (ex.abd === 'supmed' ? 'superior e média' : PORCAO_NOME[ex.abd]) : '';
  const pesoPorcao = (ex, reg) => (reg && ex && ex.abd) ? ABD_PESOS[ex.abd][reg] : 1;
  // espelha uma pose (troca esquerda ↔ direita)
  function espelharPose(P) {
    const o = {};
    for (const k in P) {
      const v = P[k];
      const nk = k.indexOf('left') === 0 ? 'right' + k.slice(4) : k.indexOf('right') === 0 ? 'left' + k.slice(5) : k;
      o[nk] = [v[0], -v[1], -v[2]];
    }
    return o;
  }
  const lados = S => (S && (S.left || S.right)) ? S : { left: S, right: S };
  const trocar = S => ({ left: S.right, right: S.left });
  for (const ex of EXERCICIOS) {
    ex._Bs = [ex.B, ex.alt ? espelharPose(ex.B) : ex.B];
    ex._As = [ex.A, ex.alt && ex.altA ? espelharPose(ex.A) : ex.A];
    if (ex.M) ex._Mmeio = [ex.M, ex.alt ? espelharPose(ex.M) : ex.M];
    if (ex.bracos) {
      const A = lados(ex.bracos.A), B = lados(ex.bracos.B);
      ex.bracos._A = [A, ex.alt ? trocar(A) : A];
      ex.bracos._B = [B, ex.alt ? trocar(B) : B];
    }
    if (ex.pernas) {
      const A = lados(ex.pernas.A), B = lados(ex.pernas.B);
      ex.pernas._A = [A, ex.alt ? trocar(A) : A];
      ex.pernas._B = [B, ex.alt ? trocar(B) : B];
      const mov = side => { const a = A[side], b = B[side]; return a.p[0] !== b.p[0] || a.p[1] !== b.p[1]; };
      ex.pernas._passo = mov('left') || mov('right');
    }
  }

  /* =====================================================================
   * 6. ANIMAÇÃO, CHÃO, ESTADO DOS MÚSCULOS
   * ===================================================================== */
  const ZERO = [0, 0, 0];
  // modo repouso: sentado de pernas cruzadas, respirando (não aparece no catálogo)
  const REPOUSO = { id: 'repouso', nome: 'Modo repouso', desc: 'Toque num exercício para começar.', repouso: true, prim: [], sec: [],
    cam: { th: 28, ph: 10, dist: 2.9, ty: 0.55 }, A: {}, B: {}, _As: [{}, {}], _Bs: [{}, {}], periodo: 4 };
  let cur = EXERCICIOS[0], t = 0, phase = 0, lastCycle = 0, lado = 0;
  let focusKey = null;
  const _w = new V3();
  const minY = l => { let m = Infinity; for (const o of l) { o.getWorldPosition(_w); if (_w.y < m) m = _w.y; } return m; };
  const avgZ = l => { let z = 0; for (const o of l) { o.getWorldPosition(_w); z += _w.z; } return z / l.length; };
  const HIPS0 = bones.hips.position.clone();
  const PES = { left: CONTACT.feet.slice(0, 3), right: CONTACT.feet.slice(3, 6) };
  function ancora(li) {
    if (cur.anchor === 'hands') return CONTACT.hands;
    if (cur.alt && cur.apoio) { const ativo = li === 0 ? 'left' : 'right'; return cur.apoio === 'ativo' ? PES[ativo] : PES[ativo === 'left' ? 'right' : 'left']; }
    return CONTACT.feet;
  }
  function applyPose(p) {
    ikErro = 0;
    if (repousoAtivo()) { applyRepouso(); return; }
    if (cur.ik === 'flexao' && !cur._calibrando) { applyFlexao(p); atualizarProps(); return; }
    const li = cur.alt ? lado : 0;
    let A = cur._As[li], B = cur._Bs[li], q = p;
    if (cur._Mmeio) {
      // pose do meio do caminho (ex.: pés passando por cima da garrafa)
      if (p < 0.5) { B = cur._Mmeio[li]; q = p * 2; } else { A = cur._Mmeio[li]; q = p * 2 - 1; }
    }
    // arco (garrafas): na subida as pernas levantam primeiro e só depois vão para o lado;
    // na descida vão para o lado primeiro e só no fim descem — o pé passa alto por cima da garrafa
    let qSobe = q, qLado = q;
    if (cur.arco && cur._Mmeio) {
      const ss = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
      if (p < 0.5) { qSobe = ss(q / 0.55); qLado = ss((q - 0.3) / 0.7); }
      else { qLado = ss(q / 0.7); qSobe = ss((q - 0.45) / 0.55); }
    }
    for (const b of boneList) {
      const a = A[b.name] || ZERO, c = B[b.name] || ZERO;
      const perna = cur.arco && /Leg|Foot/.test(b.name), qa = perna ? qSobe : q, qz = perna ? qLado : q;
      b.rotation.set(rad(a[0] + (c[0] - a[0]) * qa), rad(a[1] + (c[1] - a[1]) * qa), rad(a[2] + (c[2] - a[2]) * qz));
    }
    if (!miniRender && !cur._calibrando && movNatural()) naturalizar(p);
    bones.hips.position.copy(HIPS0);
    rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0);
    if (cur.chao) {
      posicionarNoChao(p);
    } else if (cur.pernas) {
      pernasIK(p, li);
    } else {
      if (cur.pitch === 'auto') {
        let lo = rad(15), hi = rad(115);
        const gB = GR[cur.pitchB || 'pes'];
        for (let i = 0; i < 20; i++) { const mid = (lo + hi) / 2; rig.rotation.x = mid; rig.updateMatrixWorld(true); if (minY(CONTACT.hands) - minY(gB) > 0) lo = mid; else hi = mid; }
        rig.rotation.x = (lo + hi) / 2;
      }
      rig.updateMatrixWorld(true);
      rig.position.y = -minY(cur.pitch === 'auto' ? ALL_BODY : CONTACT.feet);
      rig.position.z = cur._z0 - avgZ(ancora(li));
      rig.updateMatrixWorld(true);
    }
    if (cur.bracos) bracosIK(p, li);
    atualizarProps();
    bones.hips.getWorldPosition(_w); shadow.position.x = _w.x; shadow.position.z = _w.z;
  }
  /* ---------- Movimento natural ----------
   * Ninguém fica 100% parado: por cima da pose do exercício entram três camadas pequenas
   * (no máximo 2–3 graus): respiração (soltando o ar no esforço), uma reação do tronco/joelhos
   * ao esforço de cada repetição e um balanço lento que nunca se repete igual.
   * Deitado ou apoiado no chão, só a respiração — mãos e pés apoiados não podem escorregar.
   * Os pés continuam no chão: a altura do corpo é recalculada depois (como sempre). */
  function movNatural() { try { return CAMCFG.mov !== 'estatico'; } catch (e) { return true; } }
  const ssN = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  function perfilEsforco(ex) {
    if (ex._mov) return ex._mov;
    const tem = k => ex.prim.includes(k), id = ex.id;
    let pf;
    if (/punho/.test(id)) pf = { tronco: -0.3, topo: 0, cabeca: 0.3, joelho: 0.3 };          // punho: quase nada se mexe
    else if (ex.pernas || tem('vasto_lateral') || tem('reto_femoral') || tem('gluteo_maximo') || tem('biceps_femoral') || /agach|afundo|terra|stiff|bom_dia|levantamento|panturrilha|ponte|passada|subida/.test(id))
      pf = { tronco: -0.8, topo: 0, cabeca: 1.2, joelho: 0 };                   // pernas: peito sobe no impulso, cabeça acompanha
    else if (/desenvolvimento|overhead|arnold|acima_cabeca/.test(id))
      pf = { tronco: 0, topo: -1.6, cabeca: -0.6, joelho: 0.8 };                // acima da cabeça: lombar arqueia um pouco no alto
    else if (tem('biceps_braquial') || tem('braquiorradial') || tem('braquial'))
      pf = { tronco: -1.8, topo: 0, cabeca: 0.6, joelho: 1 };                   // roscas: tronco vai levemente para trás
    else if (tem('deltoide_lateral') || tem('deltoide_anterior'))
      pf = { tronco: 1.2, topo: 0, cabeca: 0.5, joelho: 0.8 };                  // elevações: tronco vem um pouco à frente
    else if (/remada|encolhimento|puxada|crucifixo_inverso/.test(id) || tem('trapezio_desc') || tem('latissimo_dorso'))
      pf = { tronco: 0, topo: ex.equip === 'barra' ? -0.5 : -1.2, cabeca: 0.6, joelho: 0.6 }; // puxadas: peito estufa no fim (com barra, menos: ela passa rente ao corpo)
    else pf = { tronco: -0.6, topo: 0, cabeca: 0.6, joelho: 0.6 };
    ex._mov = pf; return pf;
  }
  const _rotN = (nome, x, y, z) => { const o = bones[nome]; if (!o) return; o.rotation.x += rad(x); o.rotation.y += rad(y); o.rotation.z += rad(z); };
  let tNatFixo = null; // testes: fixa o relógio do movimento natural
  function naturalizar(p) {
    const tt = tNatFixo != null ? tNatFixo : performance.now() / 1000, PI2 = Math.PI * 2;
    const resp = Math.sin(tt * PI2 / 3.6);
    const br = 0.55 * resp + 0.45 * (1 - 2 * ssN(p)); // + = puxando o ar (peito abre); no esforço, solta o ar
    const fr = cur.chao ? 0.4 : 1; // apoiado no chão: respiração mais contida, para mãos e pés não saírem do lugar
    _rotN('chest', -0.9 * br * fr, 0, 0); _rotN('upperChest', -0.6 * br * fr, 0, 0); _rotN('neck', 0.5 * br * fr, 0, 0);
    if (cur.chao) return;
    // balanço lento (períodos diferentes: nunca se repete igual)
    const s1 = Math.sin(tt * PI2 / 5.3), s2 = Math.sin(tt * PI2 / 7.7 + 1.3), s3 = Math.sin(tt * PI2 / 6.1 + 2.1);
    _rotN('spine', 0.35 * s2, 0.4 * s1, 0.5 * s1); _rotN('neck', 0.5 * s3, 0.6 * s2, 0);
    // reação ao esforço: impulso no meio do movimento + ajuste segurando no fim
    const pf = perfilEsforco(cur), imp = Math.sin(Math.PI * Math.min(1, Math.max(0, p))), topo = ssN(p);
    _rotN('spine', pf.tronco * imp + pf.topo * topo, 0, 0);
    _rotN('neck', pf.cabeca * imp, 0, 0);
    if (pf.joelho && !cur.pernas) {
      const k = 2.2 * pf.joelho * imp; // joelhos amortecem; coxa e pé compensam para o pé seguir plano
      for (const l of ['left', 'right']) { _rotN(l + 'UpperLeg', -k / 2, 0, 0); _rotN(l + 'LowerLeg', k, 0, 0); _rotN(l + 'Foot', -k / 2, 0, 0); }
    }
  }
  function calibrate() {
    cur._calibrando = true;
    cur._z0 = 0; applyPose(0);
    const az = avgZ(ancora(0)) - rig.position.z;
    bones.hips.getWorldPosition(_w); cur._z0 = cur.pernas ? 0 : az - (_w.z - rig.position.z);
    if (cur.chao) {
      cur._ox = 0; cur._oz = 0; applyPose(0);
      const an = avgPos(GR[cur.ancora || 'quadril']), hp = bones.hips.getWorldPosition(new V3());
      cur._ox = (an.x - rig.position.x) - (hp.x - rig.position.x) + (cur.centro ? cur.centro[0] : 0);
      cur._oz = (an.z - rig.position.z) - (hp.z - rig.position.z) + (cur.centro ? cur.centro[1] : 0);
      applyPose(0);
      if (cur.garrafas) { const base = avgPos(GR[cur.ancora || 'quadril']); garrafas.forEach((g, i) => { const q = cur.garrafas[i]; g.visible = !!q; if (q) g.position.set(base.x + q[0], 0, base.z + q[1]); }); }
    }
    for (const g of garrafas) if (!cur.garrafas) g.visible = false;
    const sc = cur.sombra || [1, 1]; shadow.scale.set(sc[0], sc[1], 1);
    if (cur.ik === 'flexao') calibrarFlexao();
    cur._calibrando = false;
  }

  /* ---------- Modo repouso ---------- */
  let miniRender = false; // desenhando uma miniatura: usa a pose do exercício, nunca a de descanso
  function repousoAtivo() {
    if (cur.repouso) return true;
    if (miniRender) return false;
    try { return S.estado === 'descanso' || (S.estado === 'pausado' && S.antes === 'descanso'); } catch (e) { return false; }
  }
  const REP_FIX = Object.assign(grip(-25, -35, -20, -15), { hips: [-10, 0, 0], spine: [12, 0, 0], chest: [6, 0, 0], upperChest: [2, 0, 0], neck: [8, 0, 0] });
  function applyRepouso() {
    const tt = performance.now() / 1000;
    const resp = Math.sin(tt * 2 * Math.PI / 4.2), bal = Math.sin(tt * 2 * Math.PI / 7.3), olhar = Math.sin(tt * 2 * Math.PI / 11);
    for (const b of boneList) { const v = REP_FIX[b.name] || ZERO; b.rotation.set(rad(v[0]), rad(v[1]), rad(v[2])); }
    // respiração, leve balanço do tronco e cabeça olhando em volta
    bones.spine.rotation.x += rad(1.2 * resp); bones.chest.rotation.x -= rad(1.6 * resp);
    bones.spine.rotation.z = rad(1.8 * bal); bones.chest.rotation.z = rad(-0.8 * bal);
    bones.neck.rotation.x += rad(2 * Math.sin(tt * 0.9)); bones.head.rotation.y = rad(14 * olhar); bones.head.rotation.x = rad(3 * Math.sin(tt * 0.6));
    for (const [s] of SIDES) { const p = s > 0 ? 'left' : 'right'; bones[p + 'Shoulder'].rotation.z = rad(s * 1.2 * resp); }
    rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0);
    bones.hips.position.set(0, 0.135 + 0.002 * resp, 0);
    rig.updateMatrixWorld(true);
    // pernas cruzadas: tornozelo esquerdo sob o joelho direito e vice-versa
    const alvos = { left: new V3(-0.10, 0.075, 0.27), right: new V3(0.12, 0.105, 0.21) };
    for (const [s, pn] of SIDES) {
      ik2(bones[pn + 'UpperLeg'], bones[pn + 'LowerLeg'], bones[pn + 'Foot'], alvos[pn], new V3(s, 0.45, 0.25), L_COXA, L_CANELA);
      bones[pn + 'Foot'].rotation.set(rad(30), rad(-s * 25), rad(-s * 20)); bones[pn + 'Foot'].updateMatrixWorld(true);
    }
    // mãos apoiadas nos joelhos
    for (const [s, pn] of SIDES) {
      const joelho = bones[pn + 'LowerLeg'].getWorldPosition(new V3()).add(new V3(-s * 0.02, 0.07 + 0.004 * resp, -0.02));
      ik2(bones[pn + 'UpperArm'], bones[pn + 'LowerArm'], bones[pn + 'Hand'], joelho, new V3(s * 0.5, -0.2, -1), L_BRACO, L_ANTEBRACO);
    }
    rig.updateMatrixWorld(true);
    for (const pr of PROPS) pr.visible = false;
    shadow.position.x = 0; shadow.position.z = 0.08; shadow.scale.set(1.1, 1.1, 1);
  }
  // transição suave entre poses (exercício ↔ repouso, troca de exercício)
  let blend = null;
  function fotografarPose() {
    blend = { t: 0, q: boneList.map(b => b.quaternion.clone()), hp: bones.hips.position.clone(), rp: rig.position.clone(), rq: rig.quaternion.clone() };
  }
  function aplicarBlend(dt) {
    if (!blend) return;
    blend.t += dt / 0.6;
    const k = smooth(0, 1, blend.t);
    if (k >= 1) { blend = null; return; }
    boneList.forEach((b, i) => b.quaternion.copy(blend.q[i].clone().slerp(b.quaternion, k)));
    bones.hips.position.copy(blend.hp.clone().lerp(bones.hips.position, k));
    rig.position.copy(blend.rp.clone().lerp(rig.position, k));
    rig.quaternion.copy(blend.rq.clone().slerp(rig.quaternion, k));
    rig.updateMatrixWorld(true);
    if (!repousoAtivo()) atualizarProps();
  }

  /* ---------- Exercícios de chão: corpo deitado, ajoelhado ou de lado ---------- */
  function posicionarNoChao(p) {
    const b = cur.base || { A: [0, 0, 0], B: [0, 0, 0] }, bA = b.A, bB = b.B || b.A;
    const rx = rad(bA[0] + (bB[0] - bA[0]) * p), ry = rad(bA[1] + (bB[1] - bA[1]) * p), rz = rad(bA[2] + (bB[2] - bA[2]) * p);
    rig.rotation.set(rx, ry, rz);
    if (cur.auto) {
      const ax = cur.auto.eixo || 'x', gA = GR[cur.auto.A], gB = GR[cur.auto.B];
      const f = d => { rig.rotation.set(rx + (ax === 'x' ? d : 0), ry, rz + (ax === 'z' ? d : 0)); rig.updateMatrixWorld(true); return minY(gA) - minY(gB); };
      let lo = rad(cur.auto.faixa ? cur.auto.faixa[0] : -40), hi = rad(cur.auto.faixa ? cur.auto.faixa[1] : 40);
      let flo = f(lo), fhi = f(hi);
      if (flo * fhi > 0) { const d = Math.abs(flo) < Math.abs(fhi) ? lo : hi; f(d); }
      else {
        for (let i = 0; i < 22; i++) { const mid = (lo + hi) / 2, fm = f(mid); if ((fm > 0) === (flo > 0)) { lo = mid; flo = fm; } else hi = mid; }
        f((lo + hi) / 2);
      }
    }
    rig.updateMatrixWorld(true);
    rig.position.y = -minY(ALL_BODY);
    const an = avgPos(GR[cur.ancora || 'quadril']);
    rig.position.x = (cur._ox || 0) - an.x; rig.position.z = (cur._oz || 0) - an.z;
    rig.updateMatrixWorld(true);
  }

  /* ---------- Cinemática inversa de 2 ossos (braço ou perna) ---------- */
  const _e = new V3();
  let ikErro = 0;
  function ik2(osso1, osso2, filho, alvo, polo, L1, L2) {
    const S = osso1.getWorldPosition(new V3());
    const dv = alvo.clone().sub(S);
    const d = clamp(dv.length(), Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-4);
    const dir = dv.normalize();
    const pv = polo.clone().addScaledVector(dir, -polo.dot(dir));
    if (pv.lengthSq() < 1e-8) pv.set(0, 0, 1).addScaledVector(dir, -dir.z);
    pv.normalize();
    const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(L1 * L1 - a * a, 0));
    _e.copy(S).addScaledVector(dir, a).addScaledVector(pv, h);
    mirar(osso1, osso2.getWorldPosition(new V3()), _e);
    mirar(osso2, filho.getWorldPosition(new V3()), alvo);
    ikErro = Math.max(ikErro, filho.getWorldPosition(new V3()).distanceTo(alvo));
  }

  /* ---------- Pernas por alvo: pés fixos no chão, quadril se move ---------- */
  const L_COXA = SEG.leftUpperLeg.a.distanceTo(SEG.leftLowerLeg.a), L_CANELA = SEG.leftLowerLeg.a.distanceTo(SEG.leftFoot.a);
  const _qf = new THREE.Quaternion(), _eu = new THREE.Euler();
  function pernasIK(p, li) {
    const P = cur.pernas, sx = li === 1 ? -1 : 1;
    const pT = P._passo ? smooth(0.25, 1, p) : p, fT = P._passo ? smooth(0, 0.4, p) : p;
    const pa = P.pelvis.A, pb = P.pelvis.B;
    bones.hips.position.set(sx * (pa[0] + (pb[0] - pa[0]) * pT), pa[1] + (pb[1] - pa[1]) * pT, pa[2] + (pb[2] - pa[2]) * pT);
    rig.updateMatrixWorld(true);
    const FA = P._A[li], FB = P._B[li];
    for (const [s, pn] of SIDES) {
      const a = FA[pn], b = FB[pn];
      const moveu = a.p[0] !== b.p[0] || a.p[1] !== b.p[1];
      const lat = a.p[0] + (b.p[0] - a.p[0]) * fT, z = a.p[1] + (b.p[1] - a.p[1]) * fT;
      const pitch = (a.pitch || 0) + ((b.pitch || 0) - (a.pitch || 0)) * pT;
      const yaw = (a.yaw || 0) + ((b.yaw || 0) - (a.yaw || 0)) * fT;
      const lift = moveu ? 0.07 * Math.sin(Math.PI * fT) : 0;
      _qf.setFromEuler(_eu.set(rad(pitch), rad(s * yaw), 0, 'YXZ'));
      const bola = new V3(s * lat, 0.02 + lift, z);
      const tornozelo = bola.clone().add(new V3(-s * 0.005, 0.065, -0.145).applyQuaternion(_qf));
      const polo = new V3(Math.sin(rad(s * yaw)) + s * 0.12, 0, Math.cos(rad(s * yaw)));
      ik2(bones[pn + 'UpperLeg'], bones[pn + 'LowerLeg'], bones[pn + 'Foot'], tornozelo, polo, L_COXA, L_CANELA);
      const ft = bones[pn + 'Foot'];
      ft.parent.getWorldQuaternion(_qp).invert(); ft.quaternion.copy(_qp.multiply(_qf)); ft.updateMatrixWorld(true);
      bones[pn + 'Toes'].rotation.set(rad(-pitch), 0, 0); bones[pn + 'Toes'].updateMatrixWorld(true);
    }
  }

  /* ---------- Braços por alvo: mãos seguem posições (no peito ou a partir dos ombros) ---------- */
  const _qc = new THREE.Quaternion();
  function alvoMao(spec, frame, s, pn) {
    const ombro = bones[pn + 'UpperArm'].getWorldPosition(new V3());
    let origem, rot;
    if (frame === 'apoio') {
      origem = avgPos(GR[cur.ancora || 'quadril']); origem.y = 0;
      rot = new THREE.Quaternion();
    } else if (frame === 'ombros') {
      origem = bones.leftUpperArm.getWorldPosition(new V3()).add(bones.rightUpperArm.getWorldPosition(new V3())).multiplyScalar(0.5);
      rot = rig.getWorldQuaternion(_qc).clone();
    } else {
      origem = bones.upperChest.getWorldPosition(new V3());
      rot = bones.upperChest.getWorldQuaternion(_qc).clone();
    }
    if (spec.d) {
      const dir = new V3(s * spec.d[0], spec.d[1], spec.d[2]).normalize().applyQuaternion(rot);
      return ombro.addScaledVector(dir, (spec.r || 0.98) * (L_BRACO + L_ANTEBRACO));
    }
    return new V3(s * spec.p[0], spec.p[1], spec.p[2]).applyQuaternion(rot).add(origem);
  }
  const _qs = new THREE.Quaternion();
  function bracosIK(p, li) {
    const Bc = cur.bracos, frame = Bc.frame || 'peito';
    const SA = Bc._A[li], SB = Bc._B[li];
    const rot = frame === 'apoio' ? new THREE.Quaternion() : (frame === 'ombros' ? rig.getWorldQuaternion(new THREE.Quaternion()) : bones.upperChest.getWorldQuaternion(new THREE.Quaternion()));
    for (const [s, pn] of SIDES) {
      const ombro = bones[pn + 'UpperArm'].getWorldPosition(new V3());
      const va = alvoMao(SA[pn], frame, s, pn).sub(ombro), vb = alvoMao(SB[pn], frame, s, pn).sub(ombro);
      const la = va.length(), lb = vb.length();
      _qs.setFromUnitVectors(va.clone().normalize(), vb.clone().normalize());
      const q = new THREE.Quaternion().slerp(_qs, p);
      const W = va.normalize().applyQuaternion(q).multiplyScalar(la + (lb - la) * p).add(ombro);
      const pl = Bc.polo || [0.3, -1, -0.3];
      const polo = new V3(s * pl[0], pl[1], pl[2]).applyQuaternion(rot);
      ik2(bones[pn + 'UpperArm'], bones[pn + 'LowerArm'], bones[pn + 'Hand'], W, polo, L_BRACO, L_ANTEBRACO);
    }
  }

  /* ---------- Acessórios a cada quadro ---------- */
  const _m1 = new V3(), _m2 = new V3(), _up = new V3(0, 1, 0), _qpr = new THREE.Quaternion();
  function atualizarProps() {
    const lista = Array.isArray(cur.prop) ? cur.prop : [cur.prop || (cur.halteres ? 'halteres' : null)];
    const tem = t2 => lista.indexOf(t2) >= 0;
    for (const d of dumbbells) d.visible = tem('halteres');
    halter1.visible = tem('halter1'); anilha.visible = tem('anilha'); barra.visible = tem('barra'); barraW.visible = tem('barraW');
    for (const c of caneleiras) c.visible = tem('caneleira');
    for (const c of caneleirasPunho) c.visible = tem('caneleiraPunho');
    if (!tem('halter1') && !tem('anilha') && !tem('barra') && !tem('barraW')) return;
    rig.updateMatrixWorld(true);
    CONTACT.hands[0].getWorldPosition(_m1); CONTACT.hands[2].getWorldPosition(_m2);
    const meio = _m1.clone().add(_m2).multiplyScalar(0.5);
    if (tem('barra') || tem('barraW')) {
      const b2 = tem('barra') ? barra : barraW;
      const eixo = _m1.clone().sub(_m2); if (eixo.lengthSq() < 1e-6) eixo.set(1, 0, 0); eixo.normalize();
      b2.position.copy(meio); b2.quaternion.setFromUnitVectors(new V3(1, 0, 0), eixo);
      return;
    }
    if (tem('halter1')) {
      halter1.position.copy(meio).addScaledVector(_up, -0.075);
      halter1.quaternion.identity();
      return;
    }
    let normal;
    if (cur.anilhaNormal === 'maos') normal = _m1.clone().sub(_m2).normalize();
    else if (cur.anilhaNormal === 'mundo') normal = new V3(0, 0, 1);
    else normal = new V3(0, 0, 1).applyQuaternion(bones.upperChest.getWorldQuaternion(_qpr));
    let centro = meio;
    if (cur.anilhaBorda) {
      const fa = new V3();
      for (const pn of ['left', 'right']) fa.add(bones[pn + 'Hand'].getWorldPosition(new V3()).sub(bones[pn + 'LowerArmTwist'].getWorldPosition(new V3())));
      fa.addScaledVector(normal, -fa.dot(normal)).normalize();
      centro = meio.clone().addScaledVector(fa, 0.115);
    }
    anilha.position.copy(centro);
    anilha.quaternion.setFromUnitVectors(_up, normal);
  }

  /* ---------- Flexão: mãos e pés travados no chão, corpo gira em torno dos pés ---------- */
  let PIVO = [CONTACT.feet[1], CONTACT.feet[2], CONTACT.feet[4], CONTACT.feet[5]]; // ponta dos pés (ou joelhos)
  const _p0 = new V3(), _p1 = new V3(), _p2 = new V3(), _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _qp = new THREE.Quaternion();
  const L_BRACO = SEG.leftUpperArm.a.distanceTo(SEG.leftLowerArm.a), L_ANTEBRACO = SEG.leftLowerArm.a.distanceTo(SEG.leftHand.a);
  function pivoAtual(out) { out.set(0, 0, 0); for (const o of PIVO) { o.getWorldPosition(_w); out.add(_w); } return out.multiplyScalar(1 / PIVO.length); }
  function poseCorpo(theta) {
    // gira o corpo inteiro e encaixa a ponta dos pés de volta no ponto fixo
    rig.position.set(0, 0, 0); rig.rotation.set(theta, 0, 0); rig.updateMatrixWorld(true);
    pivoAtual(_p0); rig.position.sub(_p0).add(cur._pivo); rig.updateMatrixWorld(true);
  }
  function calibrarFlexao() {
    PIVO = cur.pivo === 'joelhos' ? GR.pivoJoelhos : GR.pivoPes;
    // posição de cima (já resolvida pelo calibrador genérico): guarda os pontos fixos
    cur._theta0 = rig.rotation.x;
    cur._pivo = pivoAtual(new V3());
    cur._maos = {}; cur._qmao = {};
    for (const [, p] of SIDES) {
      cur._maos[p] = bones[p + 'Hand'].getWorldPosition(new V3());
      cur._qmao[p] = bones[p + 'Hand'].getWorldQuaternion(new THREE.Quaternion());
    }
    // posição de baixo: inclinação em que o peito fica perto do chão
    let lo = cur._theta0, hi = cur._theta0 + rad(45);
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2; poseCorpo(mid);
      if (bones.upperChest.getWorldPosition(_w).y > cur.alturaPeito) lo = mid; else hi = mid;
    }
    cur._theta1 = (lo + hi) / 2;
  }
  function mirar(bone, childPos, alvo) {
    bone.getWorldPosition(_p1);
    _p2.copy(childPos).sub(_p1).normalize();
    _w.copy(alvo).sub(_p1).normalize();
    _qa.setFromUnitVectors(_p2, _w);
    bone.getWorldQuaternion(_qb); _qb.premultiply(_qa);
    bone.parent.getWorldQuaternion(_qp).invert();
    bone.quaternion.copy(_qp.multiply(_qb));
    bone.updateMatrixWorld(true);
  }
  function applyFlexao(p) {
    PIVO = cur.pivo === 'joelhos' ? GR.pivoJoelhos : GR.pivoPes; // cada flexão com o seu ponto de apoio
    const A = cur.A;
    for (const b of boneList) { const a = A[b.name] || ZERO; b.rotation.set(rad(a[0]), rad(a[1]), rad(a[2])); }
    poseCorpo(cur._theta0 + (cur._theta1 - cur._theta0) * p);
    const up = bones.upperChest.getWorldPosition(new V3()).sub(bones.hips.getWorldPosition(new V3())).normalize();
    for (const [s, p2] of SIDES) {
      const ua = bones[p2 + 'UpperArm'], la = bones[p2 + 'LowerArm'], hd = bones[p2 + 'Hand'];
      const S = ua.getWorldPosition(new V3()), W = cur._maos[p2];
      const dv = W.clone().sub(S);
      const d = clamp(dv.length(), Math.abs(L_BRACO - L_ANTEBRACO) + 1e-3, L_BRACO + L_ANTEBRACO - 1e-4);
      const dir = dv.normalize();
      // cotovelos apontam para trás (para os pés) e um pouco para fora
      const fora = new V3(s, 0, 0).applyQuaternion(rig.quaternion);
      const pv = up.clone().multiplyScalar(-1).addScaledVector(fora, cur.poloFora != null ? cur.poloFora : 0.45);
      pv.addScaledVector(dir, -pv.dot(dir)).normalize();
      const a = (L_BRACO * L_BRACO - L_ANTEBRACO * L_ANTEBRACO + d * d) / (2 * d);
      const h = Math.sqrt(Math.max(L_BRACO * L_BRACO - a * a, 0));
      const E = S.clone().addScaledVector(dir, a).addScaledVector(pv, h);
      mirar(ua, la.getWorldPosition(new V3()), E);
      mirar(la, hd.getWorldPosition(new V3()), W);
      hd.parent.getWorldQuaternion(_qp).invert();
      hd.quaternion.copy(_qp.multiply(cur._qmao[p2].clone()));
    }
    rig.updateMatrixWorld(true);
    bones.hips.getWorldPosition(_w); shadow.position.x = _w.x; shadow.position.z = _w.z;
  }
  function applyMuscles(p) {
    for (let i = 0; i < NM; i++) {
      const k = INST[i].k;
      const role = repousoAtivo() ? 0 : cur.prim.includes(k) ? 2 : cur.sec.includes(k) ? 1 : 0;
      let pri = 0, sec = 0, bulge = 0, dim = 0;
      const w = pesoPorcao(cur, INST[i].reg); // porções do abdome: brilho conforme a concentração
      if (role === 2) { pri = (0.3 + 0.7 * p) * w; bulge = p * w; }
      else if (role === 1) { sec = (0.25 + 0.5 * p) * w; bulge = 0.45 * p * w; }
      if (focusKey) {
        if (focusIds.has(i)) { pri = 1; sec = 0; dim = 0; } else { dim = 0.82; pri *= 0.3; sec *= 0.3; }
      }
      stateData[i * 4] = pri * 255; stateData[i * 4 + 1] = bulge * 255; stateData[i * 4 + 2] = sec * 255; stateData[i * 4 + 3] = dim * 255;
    }
    stateTex.needsUpdate = true;
  }

  /* ---------- Câmera orbital ---------- */
  const cam = { th: 0, ph: 0, dist: 3, tx: 0, ty: 1, tz: 0 }, camT = Object.assign({}, cam);
  let giroOffset = 0; // giro automático da câmera (radianos), somado ao ângulo atual, que fica sendo o centro
  let tweening = false;
  function aimCamera(c, instant) {
    camT.th = rad(c.th); camT.ph = rad(c.ph); camT.dist = c.dist; camT.tx = c.tx || 0; camT.ty = c.ty; camT.tz = c.tz || 0;
    const twoPi = Math.PI * 2; cam.th = camT.th + ((((cam.th - camT.th + Math.PI) % twoPi) + twoPi) % twoPi) - Math.PI;
    if (instant) Object.assign(cam, camT); else tweening = true;
  }
  const bestAngle = instant => aimCamera(cur.cam, instant);
  function placeCamera() {
    if (tweening) {
      let done = true;
      for (const k of ['th', 'ph', 'dist', 'tx', 'ty', 'tz']) { cam[k] += (camT[k] - cam[k]) * 0.09; if (Math.abs(camT[k] - cam[k]) > 0.002) done = false; }
      if (done) { Object.assign(cam, camT); tweening = false; }
    }
    const cp = Math.cos(cam.ph), th = cam.th + giroOffset;
    camera.position.set(cam.tx + cam.dist * Math.sin(th) * cp, cam.ty + cam.dist * Math.sin(cam.ph), cam.tz + cam.dist * Math.cos(th) * cp);
    camera.lookAt(cam.tx, cam.ty, cam.tz);
  }

  /* ---------- Toque: escolher músculo ----------
   * A escolha é feita pela GPU: o quadro é desenhado de novo num único pixel
   * (o do toque), com cada músculo pintado com o seu número. Assim vale
   * exatamente o que está visível — mãos, cabeça e halteres na frente bloqueiam.
   */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const RANGES = []; { let v0 = 0, i0 = 0; for (const pt of muscleParts) { const nv = pt.pos.length / 3; RANGES.push({ v0, nv, i0, ni: pt.idx.length }); v0 += nv; i0 += pt.idx.length; } }
  const pickRT = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const pickBuf = new Uint8Array(4);
  const pickMat = new THREE.MeshBasicMaterial({ color: 0xffffff, skinning: true });
  pickMat.onBeforeCompile = sh => {
    sh.uniforms.uStateTex = { value: stateTex }; sh.uniforms.uN = { value: NM };
    sh.vertexShader = 'attribute vec4 aM;\nattribute float aBulge;\nuniform sampler2D uStateTex;\nuniform float uN;\nvarying float vId;\n' +
      sh.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\nvec4 st = texture2D(uStateTex, vec2((aM.x + 0.5) / uN, 0.5));\ntransformed += normal * aBulge * st.y;\nvId = aM.x + 1.0;');
    sh.fragmentShader = 'varying float vId;\n' + sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );',
      'float idr = floor(vId + 0.5);\nvec4 diffuseColor = vec4(mod(idr, 256.0) / 255.0, floor(idr / 256.0) / 255.0, 0.0, 1.0);');
  };
  const blackSkin = new THREE.MeshBasicMaterial({ color: 0x000000, skinning: true });
  const black = new THREE.MeshBasicMaterial({ color: 0x000000 });
  function pickAt(clientX, clientY) {
    const r = renderer.domElement.getBoundingClientRect();
    const x = clientX - r.left, y = clientY - r.top;
    if (x < 0 || y < 0 || x >= r.width || y >= r.height) return null;
    const saved = [];
    const swap = (m, mat) => { saved.push([m, m.material]); m.material = mat; };
    swap(muscleMesh, pickMat); swap(baseMesh, blackSkin);
    for (const d of PROPS) d.traverse(o => { if (o.isMesh) swap(o, black); });
    const hid = [floor, shadow]; for (const o of hid) o.visible = false;
    const cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 1);
    camera.setViewOffset(r.width, r.height, Math.floor(x), Math.floor(y) + desvioY, 1, 1);
    renderer.setRenderTarget(pickRT); renderer.render(scene, camera);
    renderer.readRenderTargetPixels(pickRT, 0, 0, 1, 1, pickBuf);
    renderer.setRenderTarget(null); aplicarDesvio(); camera.updateProjectionMatrix();
    renderer.setClearColor(cc, ca);
    for (const o of hid) o.visible = true;
    for (const [m, mat] of saved) m.material = mat;
    const id = pickBuf[0] + pickBuf[1] * 256 - 1;
    if (id < 0 || id >= NM) return null;
    // ponto 3D do toque (para ampliar em direção a ele)
    ray.setFromCamera(ndc.set(x / r.width * 2 - 1, -y / r.height * 2 + 1), camera);
    return { k: INST[id].k, side: INST[id].side, id, ponto: hitPoint(id, ray.ray) };
  }
  // posições já deformadas (skinning) só dos vértices de um músculo
  function instPositions(id) {
    const R = RANGES[id], pa = muscleMesh.geometry.attributes.position, out = new Float32Array(R.nv * 3), v = new V3();
    muscleMesh.updateMatrixWorld(true); skeleton.update();
    for (let i = 0; i < R.nv; i++) {
      v.fromBufferAttribute(pa, R.v0 + i); muscleMesh.boneTransform(R.v0 + i, v); v.applyMatrix4(muscleMesh.matrixWorld);
      out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z;
    }
    return out;
  }
  function centroid(id) {
    const P = instPositions(id), c = new V3(), n = P.length / 3;
    for (let i = 0; i < n; i++) { c.x += P[i * 3]; c.y += P[i * 3 + 1]; c.z += P[i * 3 + 2]; }
    return c.divideScalar(Math.max(n, 1));
  }
  function hitPoint(id, r) {
    const R = RANGES[id], P = instPositions(id), idx = muscleMesh.geometry.index.array;
    const a = new V3(), b = new V3(), c = new V3(), hit = new V3();
    let best = Infinity, out = null;
    for (let i = R.i0; i < R.i0 + R.ni; i += 3) {
      a.fromArray(P, (idx[i] - R.v0) * 3); b.fromArray(P, (idx[i + 1] - R.v0) * 3); c.fromArray(P, (idx[i + 2] - R.v0) * 3);
      if (r.intersectTriangle(a, b, c, false, hit)) { const d = hit.distanceTo(r.origin); if (d < best) { best = d; out = hit.clone(); } }
    }
    return out || centroid(id);
  }

  /* ---------- Foco ---------- */
  let focusIds = new Set();
  function setFocus(k, ids) { focusKey = k; focusIds = new Set(ids); const regs = new Set(ids.map(i => INST[i].reg)); showMuscleCard(k, regs.size === 1 ? [...regs][0] : null); }
  // toque: amplia em direção ao ponto tocado, mantendo o mesmo ângulo de visão
  function focusByTap(hit) {
    setFocus(hit.k, [hit.id]); hideHint();
    const f = clamp(1.35 / cam.dist, 0.45, 1);
    if (f < 1) {
      const H = hit.ponto;
      camT.th = cam.th; camT.ph = cam.ph; camT.dist = cam.dist * f;
      camT.tx = H.x + (cam.tx - H.x) * f; camT.ty = H.y + (cam.ty - H.y) * f; camT.tz = H.z + (cam.tz - H.z) * f;
      tweening = true;
    }
  }
  // pela lista: o músculo pode estar escondido, então gira até ele
  function focusMuscle(k, sideName) {
    if (!INFO[k]) return;
    const ids = BYKEY[k];
    setFocus(k, ids);
    const regAlvo = cur.abd ? (cur.abd === 'supmed' ? 'sup' : cur.abd) : 'med';
    const inst = ids.find(i => INST[i].side === (sideName || 'left') && (!INST[i].reg || INST[i].reg === regAlvo)) ?? ids.find(i => INST[i].side === (sideName || 'left'));
    const cen = centroid(inst);
    bones.hips.getWorldPosition(_w);
    const dir = cen.clone().sub(new V3(_w.x, cen.y, _w.z)); if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1); dir.normalize();
    aimCamera({ th: Math.atan2(dir.x, dir.z) * 180 / Math.PI, ph: 8, dist: 1.25, tx: cen.x, ty: cen.y, tz: cen.z });
  }
  // mira com músculo selecionado: centraliza o músculo sem mudar o ângulo
  function centerFocused() {
    const ids = [...focusIds]; const c = new V3();
    for (const id of ids) c.add(centroid(id));
    c.divideScalar(ids.length);
    camT.th = cam.th; camT.ph = cam.ph; camT.dist = Math.min(cam.dist, ids.length > 1 ? 2.2 : 1.4);
    camT.tx = c.x; camT.ty = c.y; camT.tz = c.z; tweening = true;
  }
  function clearFocus(moveCam) { focusKey = null; focusIds = new Set(); showExerciseCard(); if (moveCam) bestAngle(false); }

  const ptrs = new Map(); let pinch0 = 0, dist0 = 0, downInfo = null, midPrev = null, panMouse = false;
  const _right = new V3(), _upv = new V3();
  // arrastar com dois dedos (ou botão direito / Shift no mouse) desloca a câmera em linha reta
  function pan(dx, dy) {
    const h = view.clientHeight || 1;
    const k = 2 * cam.dist * Math.tan(rad(camera.fov / 2)) / h;
    _right.setFromMatrixColumn(camera.matrixWorld, 0); _upv.setFromMatrixColumn(camera.matrixWorld, 1);
    cam.tx = clamp(cam.tx - _right.x * dx * k + _upv.x * dy * k, -1.5, 1.5);
    cam.ty = clamp(cam.ty - _right.y * dx * k + _upv.y * dy * k, -0.2, 2.2);
    cam.tz = clamp(cam.tz - _right.z * dx * k + _upv.z * dy * k, -1.5, 1.5);
  }
  const midpoint = () => { const a = [...ptrs.values()]; return { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 }; };
  const cv = renderer.domElement, hint = document.getElementById('hint');
  cv.addEventListener('contextmenu', e => e.preventDefault());
  const hideHint = () => { if (hint) hint.style.opacity = '0'; };
  const pinchDist = () => { const a = [...ptrs.values()]; return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); };
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    downInfo = ptrs.size === 1 ? { x: e.clientX, y: e.clientY, t: e.timeStamp, moved: false, soRevelar: revelarSo } : null;
    panMouse = e.pointerType === 'mouse' && (e.button === 2 || e.shiftKey);
    if (ptrs.size === 2) { pinch0 = pinchDist(); dist0 = cam.dist; midPrev = midpoint(); }
  });
  cv.addEventListener('pointermove', e => {
    const pr = ptrs.get(e.pointerId); if (!pr) return;
    const dx = e.clientX - pr.x, dy = e.clientY - pr.y; pr.x = e.clientX; pr.y = e.clientY;
    if (downInfo && Math.hypot(e.clientX - downInfo.x, e.clientY - downInfo.y) > 6) downInfo.moved = true;
    if (ptrs.size === 1 && (!downInfo || downInfo.moved)) {
      tweening = false; hideHint();
      if (panMouse) pan(dx, dy);
      else { cam.th -= dx * 0.009; cam.ph = clamp(cam.ph + dy * 0.007, rad(-12), rad(80)); }
    } else if (ptrs.size === 2 && pinch0 > 0) {
      tweening = false; hideHint();
      cam.dist = clamp(dist0 * pinch0 / Math.max(pinchDist(), 1), 0.6, 7);
      const m = midpoint(); if (midPrev) pan(m.x - midPrev.x, m.y - midPrev.y); midPrev = m;
    }
  });
  function ptrEnd(e) {
    if (e.type === 'pointerup' && downInfo && !downInfo.moved && ptrs.size === 1 && e.timeStamp - downInfo.t < 1200 && !downInfo.soRevelar) {
      const hit = pickAt(e.clientX, e.clientY);
      // tocar de novo no músculo já selecionado remove a seleção
      if (hit && focusIds.has(hit.id)) clearFocus(false);
      else if (hit) focusByTap(hit);
      else if (focusKey) clearFocus(false);
    }
    ptrs.delete(e.pointerId); if (ptrs.size < 2) { pinch0 = 0; midPrev = null; } downInfo = null; panMouse = false;
  }
  cv.addEventListener('pointerup', ptrEnd); cv.addEventListener('pointercancel', ptrEnd);
  cv.addEventListener('wheel', e => { e.preventDefault(); tweening = false; cam.dist = clamp(cam.dist * (1 + e.deltaY * 0.001), 0.6, 7); }, { passive: false });
  // no modo treino a tela do corpo cresce por baixo dos controles: a câmera é ajustada para o
  // corpo ficar centrado na parte livre (acima dos botões) e um pouco maior, sem cortar
  const FOV0 = camera.fov; let alturaNormal = 0, desvioY = 0;
  function aplicarDesvio() { if (desvioY) camera.setViewOffset(view.clientWidth || 1, view.clientHeight || 1, 0, desvioY, view.clientWidth || 1, view.clientHeight || 1); else camera.clearViewOffset(); }
  function resize() {
    const w = view.clientWidth || 1, h = view.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h;
    const imersivo = document.body.classList.contains('imersivo');
    if (!imersivo || !alturaNormal) { if (!imersivo) alturaNormal = h; camera.fov = FOV0; desvioY = 0; }
    else {
      const pn = document.getElementById('panel'), info = document.getElementById('exInfo');
      const ph = Math.max(0, Math.min(h * 0.45, pn.offsetHeight - (info ? info.offsetHeight : 0) - 10));
      const livre = h - ph, m = Math.max(1, Math.sqrt(livre / alturaNormal)); // m = quanto o corpo cresce
      camera.fov = 2 * Math.atan(Math.tan(rad(FOV0 / 2)) * (h / alturaNormal) / m) * 180 / Math.PI;
      desvioY = Math.round(ph / 2);
    }
    aplicarDesvio(); camera.updateProjectionMatrix();
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(view);
  window.addEventListener('resize', resize); resize();

  /* =====================================================================
   * 7. INTERFACE
   * ===================================================================== */
  const $ = id => document.getElementById(id);
  const chips = $('chips');
  const ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>';
  const ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></svg>';
  function showExerciseCard() {
    $('cardEx').hidden = false; $('cardMus').hidden = true; $('bClose').hidden = true;
    $('nome').textContent = cur.nome; $('desc').textContent = cur.desc;
    $('bInfo').hidden = !!cur.repouso;
    const mus = $('mus'); mus.innerHTML = '';
    const seen = new Set(); let shown = 0, extra = 0;
    for (const [list, cls] of [[cur.prim, 'p'], [cur.sec, 's']]) for (const k of list) {
      const pop = popNome(k, cur); if (seen.has(pop)) continue; seen.add(pop);
      if (shown >= 6) { extra++; continue; } shown++;
      const s = document.createElement('button'); s.className = 'm ' + cls; s.textContent = pop;
      s.textContent = pop;
      s.addEventListener('click', () => focusMuscle(k)); mus.appendChild(s);
    }
    if (extra) { const s = document.createElement('span'); s.className = 'm more'; s.textContent = '+' + extra; mus.appendChild(s); }
    for (const el of chips.children) el.classList.toggle('on', el.dataset.id === cur.id);
  }
  function showMuscleCard(k, reg) {
    const inf = INFO[k];
    $('cardEx').hidden = true; $('cardMus').hidden = false; $('bClose').hidden = false;
    const foco = cur.prim.includes(k) || cur.sec.includes(k) ? focoAbdTxt(cur) : '';
    // tocou numa porção: "Reto do abdome (porção inferior)"; pela lista: mostra onde está o foco
    $('mTec').textContent = inf[0] + (reg ? ' (porção ' + PORCAO_NOME[reg] + ')' : foco ? ' (foco na porção ' + foco + ')' : '');
    $('mPopTxt').textContent = inf[1]; $('mReg').textContent = inf[2];
    let fun = inf[3];
    if (k === 'reto_abdome') fun += ' É um músculo só, dividido em gomos: todo ele trabalha junto, mas cada exercício concentra mais esforço numa porção.';
    $('mFun').textContent = fun;
    let role = cur.prim.includes(k) ? 'Principal neste exercício' : cur.sec.includes(k) ? 'Auxiliar neste exercício' : 'Não é o foco deste exercício';
    if (reg && foco) { const w = pesoPorcao(cur, reg); role += w >= 1 ? ' · porção mais exigida' : w >= 0.8 ? ' · bem exigida' : w >= 0.6 ? ' · exigência média' : ' · exigência menor'; }
    $('mRole').textContent = role;
  }
  function setExercise(id, instantCam, daSequencia) {
    if (!daSequencia) { try { if (SEQ) sairSequencia(true); } catch (e) { /* ainda iniciando */ } }
    if (!instantCam) fotografarPose();
    cur = id === 'repouso' ? REPOUSO : (EXERCICIOS.find(e => e.id === id) || EXERCICIOS[0]);
    focusKey = null; focusIds = new Set(); t = 0; phase = 0; lastCycle = 0;
    if (typeof resetTreino === 'function') resetTreino(true);
    lado = 0;
    if (cur.repouso) { applyPose(0); applyMuscles(0); bestAngle(instantCam); showExerciseCard(); sincronizarGrupo(); return; }
    calibrate(); applyPose(0); applyMuscles(0); bestAngle(instantCam); showExerciseCard();
    sincronizarGrupo();
  }
  /* ---------- Catálogo de exercícios e ficha "como fazer" ---------- */
  function norm(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

  const EQUIP = { halteres: 'Halteres', barra: 'Barra', anilha: 'Anilha', caneleira: 'Caneleira', corpo: 'Peso do corpo' };
  const REGIAO = { superior: 'Superior', inferior: 'Inferior', core: 'Abdômen e core', total: 'Corpo inteiro' };
  const ICON_LISTA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>';
  let grupo = null;
  const popNome = (k, ex) => INFO[k][1].replace(/ \(.*\)$/, '') + (k === 'reto_abdome' && ex && ex.abd ? ' (' + focoAbdTxt(ex) + ')' : '');
  const musculosTxt = ex => [...new Set(ex.prim.map(k => popNome(k, ex)))].join(' · ');
  function renderChips() {
    chips.innerHTML = '';
    const g = document.createElement('button'); g.className = 'chip grp'; g.id = 'bGrupo';
    g.innerHTML = ICON_LISTA + '<span></span>'; g.lastChild.textContent = EQUIP[grupo.equip] + ' · ' + REGIAO[grupo.regiao];
    g.setAttribute('aria-label', 'Escolher exercício deste grupo'); g.addEventListener('click', () => abrirCatalogo(null, grupo.equip + '|' + grupo.regiao)); chips.appendChild(g);
    for (const ex of EXERCICIOS.filter(e => e.equip === grupo.equip && e.regiao === grupo.regiao)) {
      const b = document.createElement('button'); b.className = 'chip'; b.dataset.id = ex.id; b.textContent = ex.nome;
      b.classList.toggle('on', ex.id === cur.id);
      b.addEventListener('click', () => {
        if (cur.id === ex.id) { setExercise('repouso'); return; }
        setExercise(ex.id); b.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      });
      chips.appendChild(b);
    }
  }
  function sincronizarGrupo() {
    if (cur.repouso) {
      if (!grupo) { grupo = { equip: 'halteres', regiao: 'superior' }; renderChips(); }
      for (const el of chips.children) el.classList.remove('on');
      return;
    }
    if (!grupo || grupo.equip !== cur.equip || grupo.regiao !== cur.regiao) { grupo = { equip: cur.equip, regiao: cur.regiao }; renderChips(); }
    const on = chips.querySelector('.chip.on'); if (on && on.scrollIntoView) try { on.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) { /* ok */ }
  }
  /* ---------- Catálogo: grupo (lista suspensa própria), lista ou miniaturas, e prévia ---------- */
  const CAT_KEY = chave('corpo3d.catalogo.v1');
  const GRUPOS = [];
  for (const eq in EQUIP) for (const rg in REGIAO) { const n = EXERCICIOS.filter(e => e.equip === eq && e.regiao === rg).length; if (n) GRUPOS.push({ k: eq + '|' + rg, eq, rg, nome: EQUIP[eq] + ' · ' + REGIAO[rg], n }); }
  // grupos: 'todos', um equipamento inteiro ('eq:halteres') ou equipamento+região ('halteres|superior')
  const EQUIPS = []; for (const g of GRUPOS) if (!EQUIPS.includes(g.eq)) EQUIPS.push(g.eq);
  const totalEq = eq => GRUPOS.filter(g => g.eq === eq).reduce((a, g) => a + g.n, 0);
  const grupoValido = k => k === 'todos' || (typeof k === 'string' && (k.startsWith('eq:') ? EQUIPS.includes(k.slice(3)) : GRUPOS.some(g => g.k === k)));
  const CAT = (function () {
    const c = { grupo: 'todos', modo: 'lista', favs: [], soFav: false };
    try { const o = JSON.parse(localStorage.getItem(CAT_KEY) || '{}') || {}; if (grupoValido(o.grupo)) c.grupo = o.grupo; if (o.modo === 'mini' || o.modo === 'lista') c.modo = o.modo;
      if (Array.isArray(o.favs)) c.favs = o.favs.filter(id => EXERCICIOS.some(e => e.id === id)); c.soFav = o.soFav === true; } catch (e) { /* padrão */ }
    return c;
  })();
  function gravarCat() { try { const tx = JSON.stringify(CAT); localStorage.setItem(CAT_KEY, tx); return localStorage.getItem(CAT_KEY) === tx; } catch (e) { return false; } }
  /* ---------- Favoritos (de cada perfil) ---------- */
  const ESTRELA = on => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="' + (on ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  const ehFav = id => CAT.favs.includes(id);
  function alternarFav(id) {
    const antes = CAT.favs.slice();
    CAT.favs = ehFav(id) ? CAT.favs.filter(x => x !== id) : CAT.favs.concat(id);
    if (!gravarCat()) { CAT.favs = antes; $('exMsg').textContent = 'Atenção: não consegui gravar o favorito neste aparelho.'; return false; }
    $('exMsg').textContent = '';
    return true;
  }
  function botaoEstrela(ex, aoMudar) {
    const b = document.createElement('span'); b.setAttribute('role', 'button'); b.tabIndex = 0; b.className = 'fav' + (ehFav(ex.id) ? ' on' : '');
    const pinta = () => { const on = ehFav(ex.id); b.classList.toggle('on', on); b.innerHTML = ESTRELA(on); b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', (on ? 'Tirar dos favoritos: ' : 'Favoritar: ') + ex.nome); };
    pinta();
    const agir = e => { e.stopPropagation(); e.preventDefault(); if (alternarFav(ex.id)) { pinta(); if (aoMudar) aoMudar(); } };
    b.addEventListener('click', agir);
    b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') agir(e); });
    b.addEventListener('pointerdown', e => e.stopPropagation());
    return b;
  }
  function filtroFavUI() {
    const b = $('bSoFav'); b.classList.toggle('on', CAT.soFav); b.innerHTML = ESTRELA(CAT.soFav);
    b.setAttribute('aria-pressed', String(CAT.soFav)); b.title = CAT.soFav ? 'Mostrando só favoritos (toque para ver todos)' : 'Mostrar só favoritos';
    $('exGrupo').classList.toggle('desligado', CAT.soFav);
  }
  $('bSoFav').addEventListener('click', () => { CAT.soFav = !CAT.soFav; gravarCat(); fecharGrupoMenu(); renderCatalogo($('exQ').value); $('exList').scrollTop = 0; });
  const grupoNome = k => k === 'todos' ? 'Todos os grupos (' + EXERCICIOS.length + ')' : k.startsWith('eq:') ? EQUIP[k.slice(3)] + ' · todos (' + totalEq(k.slice(3)) + ')' : (g => g.nome + ' (' + g.n + ')')(GRUPOS.find(g => g.k === k));
  // lista em árvore: Todos → equipamento → região, com as linhas em "L" ligando os níveis
  function renderGrupoMenu() {
    const m = $('exGrupoMenu'); m.innerHTML = '';
    // guias: para cada nível acima, se a linha vertical continua (│); no nível do item, ├ ou └
    const op = (k, nome, n, guias) => {
      const b = document.createElement('button'); b.className = 'ddOp' + (CAT.grupo === k ? ' on' : '') + (guias.length === 1 ? ' eq' : guias.length === 0 ? ' raiz' : ''); b.setAttribute('role', 'option'); b.setAttribute('aria-selected', String(CAT.grupo === k)); b.dataset.k = k;
      for (const g of guias) { const sp = document.createElement('span'); sp.className = 'gv ' + g; sp.setAttribute('aria-hidden', 'true'); b.appendChild(sp); }
      const tx = document.createElement('span'); tx.className = 'ddTx'; tx.textContent = nome; b.appendChild(tx);
      const em = document.createElement('em'); em.textContent = String(n); b.appendChild(em);
      b.addEventListener('click', () => { CAT.grupo = k; CAT.soFav = false; gravarCat(); fecharGrupoMenu(); renderCatalogo($('exQ').value); $('exList').scrollTop = 0; });
      m.appendChild(b);
    };
    op('todos', 'Todos os grupos', EXERCICIOS.length, []);
    EQUIPS.forEach((eq, i) => {
      const ultEq = i === EQUIPS.length - 1;
      op('eq:' + eq, EQUIP[eq], totalEq(eq), [ultEq ? 'l' : 't']);
      const regs = GRUPOS.filter(g => g.eq === eq);
      regs.forEach((g, j) => op(g.k, REGIAO[g.rg], g.n, [ultEq ? 'n' : 'v', j === regs.length - 1 ? 'l' : 't']));
    });
  }
  function abrirGrupoMenu() { renderGrupoMenu(); $('exGrupoMenu').hidden = false; $('exGrupoBtn').setAttribute('aria-expanded', 'true'); const on = $('exGrupoMenu').querySelector('.on'); if (on) { on.focus({ preventScroll: true }); on.scrollIntoView({ block: 'nearest' }); } }
  function fecharGrupoMenu() { $('exGrupoMenu').hidden = true; $('exGrupoBtn').setAttribute('aria-expanded', 'false'); }
  $('exGrupoBtn').addEventListener('click', e => { e.stopPropagation(); if ($('exGrupoMenu').hidden) abrirGrupoMenu(); else fecharGrupoMenu(); });
  document.addEventListener('click', e => { if (!$('exGrupoMenu').hidden && !$('exGrupo').contains(e.target)) fecharGrupoMenu(); });
  $('exGrupoMenu').addEventListener('keydown', e => {
    const ops = [...$('exGrupoMenu').querySelectorAll('.ddOp')], i = ops.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); (ops[i + 1] || ops[0]).focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (ops[i - 1] || ops[ops.length - 1]).focus(); }
    else if (e.key === 'Escape') { fecharGrupoMenu(); $('exGrupoBtn').focus(); }
  });
  for (const o of $('exModo').children) o.addEventListener('click', () => { CAT.modo = o.dataset.v; gravarCat(); renderCatalogo($('exQ').value); });

  function filtrarCatalogo(q) {
    const nq = norm(q || '');
    if (CAT.soFav) return EXERCICIOS.filter(e => ehFav(e.id) && (!nq || norm(e.nome + ' ' + e.prim.concat(e.sec).map(k => INFO[k][0] + ' ' + INFO[k][1]).join(' ')).includes(nq)));
    return EXERCICIOS.filter(e => (CAT.grupo === 'todos' || (CAT.grupo.startsWith('eq:') ? e.equip === CAT.grupo.slice(3) : e.equip + '|' + e.regiao === CAT.grupo)) &&
      (!nq || norm(e.nome + ' ' + e.prim.concat(e.sec).map(k => INFO[k][0] + ' ' + INFO[k][1]).join(' ')).includes(nq)));
  }
  function renderCatalogo(q) {
    $('exGrupoTxt').textContent = CAT.soFav ? 'Favoritos (' + CAT.favs.length + ')' : grupoNome(CAT.grupo);
    filtroFavUI();
    for (const o of $('exModo').children) { o.classList.toggle('on', o.dataset.v === CAT.modo); o.setAttribute('aria-pressed', String(o.dataset.v === CAT.modo)); }
    const box = $('exList'); box.innerHTML = ''; MINI.limpar();
    let todos = filtrarCatalogo(q);
    // buscou e não há nada no grupo escolhido: mostra o que existe nos outros grupos
    if (q && !todos.length && CAT.grupo !== 'todos' && !CAT.soFav) {
      const g0 = CAT.grupo; CAT.grupo = 'todos'; todos = filtrarCatalogo(q); CAT.grupo = g0;
      if (todos.length) { const av = document.createElement('p'); av.className = 'empty'; av.style.margin = '10px 0 0'; av.textContent = 'Nada neste grupo. Encontrados em outros grupos:'; box.appendChild(av); }
    }
    for (const g of GRUPOS) {
      const lista = todos.filter(e => e.equip === g.eq && e.regiao === g.rg);
      if (!lista.length) continue;
      if (CAT.grupo === 'todos' || CAT.grupo.startsWith('eq:') || q || CAT.soFav) { const h = document.createElement('div'); h.className = 'lh'; h.textContent = g.nome + ' (' + lista.length + ')'; box.appendChild(h); }
      const alvo = CAT.modo === 'mini' ? box.appendChild(Object.assign(document.createElement('div'), { className: 'gal' })) : box;
      for (const ex of lista) {
        const it = document.createElement('button');
        if (CAT.modo === 'mini') {
          it.className = 'gi' + (ex.id === cur.id && !escolhaCb ? ' on' : '');
          const img = document.createElement('div'); img.className = 'giImg'; it.appendChild(img);
          const cv2 = document.createElement('canvas'); cv2.width = cv2.height = MINI.TAM; img.appendChild(cv2);
          img.appendChild(botaoEstrela(ex, () => { if (CAT.soFav) renderCatalogo($('exQ').value); }));
          if (!escolhaCb) img.appendChild(botaoAddTreino(ex));
          const b = document.createElement('b'); b.textContent = ex.nome; it.appendChild(b);
          const sp = document.createElement('span'); sp.textContent = musculosTxt(ex); it.appendChild(sp);
          MINI.registrar(cv2, ex);
        } else {
          it.className = 'li';
          const tx = document.createElement('div'); tx.className = 'liTx';
          const b = document.createElement('b'); b.textContent = ex.nome; tx.appendChild(b);
          if (ex.alt) { const tg = document.createElement('span'); tg.className = 'tg'; tg.textContent = 'alternado'; b.appendChild(tg); }
          const sp = document.createElement('span'); sp.textContent = musculosTxt(ex); tx.appendChild(sp);
          it.appendChild(tx);
          if (!escolhaCb) it.appendChild(botaoAddTreino(ex));
          it.appendChild(botaoEstrela(ex, () => { if (CAT.soFav) renderCatalogo($('exQ').value); }));
          if (ex.id === cur.id && !escolhaCb) it.style.background = 'rgba(100,42,144,.18)';
        }
        it.dataset.id = ex.id;
        it.addEventListener('click', () => abrirPrevia(ex));
        alvo.appendChild(it);
      }
    }
    if (!box.children.length) box.innerHTML = CAT.soFav ? (q ? '<p class="empty">Nenhum favorito com essa busca.</p>' : '<p class="empty">Nenhum favorito ainda. Toque na estrela de um exercício para favoritar.</p>')
      : '<p class="empty">Nenhum exercício encontrado' + (CAT.grupo !== 'todos' ? ' neste grupo' : '') + '.</p>';
  }
  let escolhaCb = null; // quando o catálogo é aberto para escolher um exercício do treino
  function abrirCatalogo(cb, grupoK) {
    escolhaCb = typeof cb === 'function' ? cb : null;
    if (grupoValido(grupoK)) { CAT.grupo = grupoK; gravarCat(); }
    $('exTit').textContent = escolhaCb ? 'Escolha o exercício para o treino' : '';
    $('exTit').hidden = !escolhaCb;
    $('exQ').value = ''; fecharGrupoMenu(); renderCatalogo(''); $('exSheet').hidden = false;
  }
  function fecharCatalogo() { $('exSheet').hidden = true; escolhaCb = null; fecharGrupoMenu(); MINI.limpar(); }
  $('bExClose').addEventListener('click', fecharCatalogo);
  $('exQ').addEventListener('input', e => renderCatalogo(e.target.value));

  /* ---------- Prévia: janela com o exercício em movimento antes de começar ---------- */
  let previaEx = null;
  function abrirPrevia(ex) {
    previaEx = ex;
    $('pvNome').textContent = ex.nome;
    $('pvGrupo').textContent = EQUIP[ex.equip] + ' · ' + REGIAO[ex.regiao] + (ex.alt ? ' · alterna os lados' : '') + (ex.isometria ? ' · isométrico' : '');
    $('pvMus').textContent = 'Trabalha: ' + musculosTxt(ex);
    const ve = $('pvFav'); ve.innerHTML = ''; if (!escolhaCb) ve.appendChild(botaoAddTreino(ex)); ve.appendChild(botaoEstrela(ex, () => renderCatalogo($('exQ').value)));
    $('bPvFazer').textContent = escolhaCb ? 'Adicionar ao treino' : 'Começar exercício';
    $('pvSheet').hidden = false;
    MINI.abrirPrevia(ex, $('pvCena'));
    $('bPvFazer').focus({ preventScroll: true });
  }
  function fecharPrevia() { $('pvSheet').hidden = true; previaEx = null; MINI.fecharPrevia(); }
  $('bPvVoltar').addEventListener('click', fecharPrevia);
  $('pvSheet').addEventListener('click', e => { if (e.target.id === 'pvSheet') fecharPrevia(); });
  $('bPvFazer').addEventListener('click', () => {
    const ex = previaEx; if (!ex) return;
    const cb = escolhaCb;
    fecharPrevia(); fecharCatalogo();
    if (cb) cb(ex.id); else setExercise(ex.id);
  });
  $('bPvInfo').addEventListener('click', () => { if (previaEx) abrirInfo(previaEx); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('pvSheet').hidden) fecharPrevia(); });

  function abrirInfo(exArg) {
    const ex = exArg && exArg.id ? exArg : cur, inf = ex.info || {};
    $('infoNome').textContent = ex.nome;
    const tags = $('infoTags'); tags.innerHTML = '';
    for (const tx of [EQUIP[ex.equip], REGIAO[ex.regiao], ex.alt ? 'Alterna os lados' : null].filter(Boolean)) { const s2 = document.createElement('span'); s2.className = 'tag'; s2.textContent = tx; tags.appendChild(s2); }
    const body = $('infoBody'); body.innerHTML = '';
    const p0 = document.createElement('p'); p0.id = 'infoDesc'; p0.textContent = ex.desc; body.appendChild(p0);
    const secao = (titulo, el) => { const h = document.createElement('div'); h.className = 'ih'; h.textContent = titulo; body.appendChild(h); body.appendChild(el); };
    const mus = document.createElement('div'); mus.className = 'mus'; mus.id = 'infoMus'; mus.style.display = 'flex'; mus.style.flexWrap = 'wrap'; mus.style.gap = '6px';
    const vistos = new Set();
    for (const [lista, cls] of [[ex.prim, 'p'], [ex.sec, 's']]) for (const k of lista) {
      if (vistos.has(k)) continue; vistos.add(k);
      const b2 = document.createElement('button'); b2.className = 'm ' + cls; b2.textContent = k === 'reto_abdome' && ex.abd ? 'Abdômen (porção ' + focoAbdTxt(ex) + ')' : INFO[k][1];
      b2.addEventListener('click', () => { $('infoSheet').hidden = true; focusMuscle(k); }); mus.appendChild(b2);
    }
    secao('Músculos trabalhados', mus);
    const lista = (itens, ordenada) => { const l = document.createElement(ordenada ? 'ol' : 'ul'); for (const tx of itens) { const li = document.createElement('li'); li.textContent = tx; l.appendChild(li); } return l; };
    if (inf.passos && inf.passos.length) secao('Como fazer', lista(inf.passos, true));
    if (inf.dicas && inf.dicas.length) secao('Dicas', lista(inf.dicas));
    if (inf.erros && inf.erros.length) secao('Erros comuns', lista(inf.erros));
    if (inf.resp) { const p = document.createElement('p'); p.textContent = inf.resp; secao('Respiração', p); }
    $('infoSheet').hidden = false;
  }
  $('bInfo').addEventListener('click', () => abrirInfo());
  $('bInfoClose').addEventListener('click', () => { $('infoSheet').hidden = true; });
  for (const id of ['exSheet', 'infoSheet', 'cfgSheet', 'sheet', 'trSheet']) $(id).addEventListener('click', e => { if (e.target.id === id) { if (id === 'exSheet') fecharCatalogo(); else $(id).hidden = true; } });
  $('bBest').addEventListener('click', () => { if (focusKey) centerFocused(); else bestAngle(false); });
  $('bClose').addEventListener('click', () => clearFocus(true));
  $('bBack').addEventListener('click', () => clearFocus(true));
  $('mPop').addEventListener('click', () => clearFocus(false));

  // lista / busca de músculos
  const REG_ORDER = ['Pescoço', 'Ombro', 'Tronco', 'Costas', 'Braço', 'Antebraço', 'Quadril', 'Coxa', 'Joelho', 'Perna'];
  function renderList(q) {
    const box = $('list'); box.innerHTML = ''; const nq = norm(q || '');
    for (const reg of REG_ORDER) {
      const keys = Object.keys(INFO).filter(k => INFO[k][2] === reg && (!nq || norm(INFO[k][0] + ' ' + INFO[k][1]).includes(nq)));
      if (!keys.length) continue;
      const h = document.createElement('div'); h.className = 'lh'; h.textContent = reg; box.appendChild(h);
      for (const k of keys) {
        const it = document.createElement('button'); it.className = 'li';
        it.innerHTML = '<b></b><span></span>'; it.firstChild.textContent = INFO[k][0]; it.lastChild.textContent = INFO[k][1];
        it.addEventListener('click', () => { $('sheet').hidden = true; focusMuscle(k); });
        box.appendChild(it);
      }
    }
    if (!box.children.length) box.innerHTML = '<p class="empty">Nenhum músculo com esse nome.</p>';
  }
  $('bList').addEventListener('click', () => { $('sheet').hidden = false; $('q').value = ''; renderList(''); });
  $('bSheetClose').addEventListener('click', () => { $('sheet').hidden = true; });
  $('q').addEventListener('input', e => renderList(e.target.value));

  /* =====================================================================
   * 8. TREINO — repetições, ciclos, descanso e voz
   *    estados: previa (anima sem contar), treino, pausado, descanso, fim,
   *    congelado (usado pelos testes)
   * ===================================================================== */
  const CFG_KEY = chave('corpo3d.treino.v1');
  const CFG_PADRAO = { reps: 10, ciclos: 3, descanso: 30, voz: true, ritmo: 1, caneleira: 1 };
  const LIM = { reps: [1, 50, 1], ciclos: [1, 10, 1], descanso: [0, 300, 5], pausaRep: [0, 30, 1], depois: [0, 300, 5] };
  const RITMO_VALORES = [1.45, 1, 0.7, 0.5]; // lento, normal, rápido, turbo
  function lerCfg() {
    let o = {};
    try { o = JSON.parse(localStorage.getItem(CFG_KEY) || '{}') || {}; } catch (e) { o = {}; }
    const c = Object.assign({}, CFG_PADRAO);
    for (const k of ['reps', 'ciclos', 'descanso']) { const v = Math.round(Number(o[k])); if (Number.isFinite(v)) c[k] = clamp(v, LIM[k][0], LIM[k][1]); }
    if (typeof o.voz === 'boolean') c.voz = o.voz;
    if (RITMO_VALORES.includes(Number(o.ritmo))) c.ritmo = Number(o.ritmo);
    if ([1, 3, 5].includes(Number(o.caneleira))) c.caneleira = Number(o.caneleira);
    return c;
  }
  function salvarCfg(c) {
    try {
      localStorage.setItem(CFG_KEY, JSON.stringify(c));
      return JSON.stringify(JSON.parse(localStorage.getItem(CFG_KEY))) === JSON.stringify(c);
    } catch (e) { return false; }
  }
  let cfg = lerCfg();
  let tc = cfg;          // configuração do treino em andamento (a geral ou a do exercício da sequência)
  let SEQ = null;        // sequência em execução: { t: treino salvo, idx }
  escalaCaneleira(cfg.caneleira);
  const usaCaneleira = () => { const l = Array.isArray(cur.prop) ? cur.prop : [cur.prop]; return l.indexOf('caneleira') >= 0 || l.indexOf('caneleiraPunho') >= 0; };

  // voz (síntese do próprio aparelho, em português)
  const VOZ_OK = typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined';
  let vozPt = null;
  function escolherVoz() {
    if (!VOZ_OK) return;
    try {
      const vs = window.speechSynthesis.getVoices() || [];
      vozPt = vs.find(v => /pt[-_]BR/i.test(v.lang)) || vs.find(v => /^pt/i.test(v.lang)) || null;
    } catch (e) { vozPt = null; }
  }
  if (VOZ_OK) { escolherVoz(); try { window.speechSynthesis.addEventListener('voiceschanged', escolherVoz); } catch (e) { /* navegador antigo */ } }
  function falar(txt, interromper, forcar, aoTerminar) {
    if ((!cfg.voz && !forcar) || !VOZ_OK) return false;
    try {
      // só cancela se houver algo falando: em alguns Androids cancelar e falar em seguida faz a fala nova "terminar" na hora
      if (interromper && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(txt);
      u.lang = 'pt-BR'; if (vozPt) u.voice = vozPt; u.rate = 1.08;
      if (window.Musica) {
        let solto = false; const soltar = () => { if (!solto) { solto = true; Musica.abaixar(false); } };
        u.onstart = () => Musica.abaixar(true); u.onend = soltar; u.onerror = soltar;
        setTimeout(() => { if (!solto && u.onstart) soltar(); }, 9000);
      }
      if (aoTerminar) u.addEventListener('end', () => aoTerminar());
      window.speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; /* sem voz: o contador na tela continua valendo */ }
  }
  function calarVoz() { if (VOZ_OK) try { window.speechSynthesis.cancel(); } catch (e) { /* ignora */ } if (window.Musica) Musica.soltarAbaixar(); }

  const S = { estado: 'previa', antes: 'treino', ciclo: 1, rep: 0, resto: 0, restoInt: 0, espera: 0, troca: false, prep: null };
  const ICON_RESET = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/></svg>';
  $('bReset').innerHTML = ICON_RESET;

  function painelTreino() {
    const ativo = S.estado !== 'previa' && S.estado !== 'congelado';
    $('nRep').textContent = String(S.rep);
    $('nRepTot').textContent = String(tc.reps);
    $('nUn').textContent = cur.isometria ? 's' : 'reps';
    let sub;
    if (S.estado === 'fim') sub = SEQ ? 'Fim do treino' : 'Fim do exercício';
    else if (S.troca && (S.estado === 'descanso' || (S.estado === 'pausado' && S.antes === 'descanso'))) sub = 'Descanso · próximo exercício';
    else if (S.estado === 'descanso' || (S.estado === 'pausado' && S.antes === 'descanso')) sub = 'Descanso · ' + S.ciclo + '/' + tc.ciclos + ' feitos';
    else if (S.estado === 'pergunta') sub = 'Concluiu o exercício? Responda na tela';
    else if (S.estado === 'concluindo' || (S.estado === 'pausado' && S.antes === 'concluindo')) sub = 'Ciclo ' + S.ciclo + ' concluído' + (S.estado === 'pausado' ? ' · pausado' : '');
    else if (S.estado === 'preparo' || (S.estado === 'pausado' && S.antes === 'preparo')) sub = 'Prepare-se · ciclo ' + S.ciclo + ' de ' + tc.ciclos + (S.estado === 'pausado' ? ' · pausado' : '');
    else if (ativo) sub = 'Ciclo ' + S.ciclo + ' de ' + tc.ciclos + (S.estado === 'pausado' ? ' · pausado' : S.espera > 0 ? ' · pausa' : '');
    else sub = (usaCaneleira() ? 'Caneleira ' + cfg.caneleira + ' kg · ' : '') + tc.ciclos + (tc.ciclos > 1 ? ' ciclos' : ' ciclo') + (tc.descanso ? ' · desc. ' + tc.descanso + ' s' : '');
    if (cur.repouso) sub = 'Escolha um exercício';
    if (SEQ && !cur.repouso) sub = (S.estado === 'fim' ? '' : (SEQ.idx + 1) + '/' + SEQ.t.itens.length + ' · ') + sub;
    $('nSub').textContent = sub;
    $('cont').firstElementChild.style.display = cur.repouso ? 'none' : '';
    const b = $('bPlay');
    const rodando = S.estado === 'treino' || S.estado === 'descanso' || S.estado === 'preparo' || S.estado === 'concluindo';
    const rot = cur.repouso ? 'Escolher' : rodando ? 'Pausar' : S.estado === 'pausado' ? 'Continuar' : S.estado === 'fim' ? 'Repetir' : 'Iniciar';
    b.innerHTML = rodando ? ICON_PAUSE : ICON_PLAY;
    b.setAttribute('aria-label', rot); b.title = rot;
    b.classList.toggle('rodando', rodando);
    const lista = listaNavegacao(), i = SEQ ? SEQ.idx : lista.indexOf(cur.id);
    $('bPrev').disabled = SEQ ? false : cur.repouso;
    $('bNext').disabled = SEQ ? SEQ.idx >= SEQ.t.itens.length - 1 && S.estado === 'fim' : (!cur.repouso && i >= lista.length - 1);
    $('bPrev').setAttribute('aria-label', SEQ && SEQ.idx === 0 ? 'Recomeçar o exercício' : 'Exercício anterior');
    $('rest').hidden = S.estado !== 'descanso';
    // treino em andamento: "Parar" no lugar do recomeçar; pausado: janela com Continuar / Encerrar
    const sessao = ['treino', 'preparo', 'descanso', 'concluindo', 'pausado', 'pergunta'].includes(S.estado);
    if (S.estado === 'pausado' && S.antes === 'pergunta') $('concBox').hidden = true;
    $('bParar').hidden = !sessao; $('bReset').hidden = sessao;
    $('pausaBox').hidden = S.estado !== 'pausado';
    if (S.estado === 'pausado') $('pausaInfo').textContent = (SEQ ? SEQ.t.nome + ' · exercício ' + (SEQ.idx + 1) + ' de ' + SEQ.t.itens.length + '\n' : '') + cur.nome + ' · ciclo ' + S.ciclo + ' de ' + tc.ciclos + (S.antes === 'treino' ? ' · ' + S.rep + '/' + tc.reps : '');
    if (!$('rest').hidden) {
      $('restN').textContent = String(Math.max(0, Math.ceil(S.resto)));
      $('restNext').textContent = S.troca && SEQ ? 'Próximo: ' + nomeEx(SEQ.t.itens[SEQ.idx + 1].ex) : 'Próximo: ciclo ' + (S.ciclo + 1) + ' de ' + tc.ciclos;
    }
    modoImersivo(rodando || S.estado === 'pausado', rodando);
    seqBarUI(); atualizarMusica(); telaAcesa(rodando || S.estado === 'pausado');
  }
  function iniciarTreino() {
    S.ciclo = 1; S.rep = 0; S.espera = 0; S.troca = false; musicaNova = true; S.reg = null; esconderConclusao();
    preparar((SEQ ? (SEQ.idx === 0 ? 'Treino ' + SEQ.t.nome + '. ' : '') + 'Exercício ' + (SEQ.idx + 1) + ' de ' + SEQ.t.itens.length + ': ' : '') + cur.nome + (usaCaneleira() ? ', com caneleira de ' + cfg.caneleira + (cfg.caneleira > 1 ? ' quilos' : ' quilo') : '') + '. ' + tc.reps + (cur.isometria ? ' segundos, ' : ' repetições, ') + tc.ciclos + (tc.ciclos > 1 ? ' ciclos' : ' ciclo') + '.' + (tc.ciclos > 1 ? ' Ciclo 1.' : ''));
  }
  // antes de contar: o corpo fica na posição inicial, só respirando, enquanto a voz anuncia;
  // depois a voz diz "Começa!" e só então a contagem começa
  // tempo real (não depende da animação). A voz avisa quando termina, mas alguns celulares avisam
  // cedo demais: por isso há um tempo mínimo proporcional ao texto, e um máximo caso o aviso nunca chegue
  const agora = () => performance.now();
  function preparar(texto) {
    if (window.__semPreparo) { S.estado = 'treino'; t = 0; lastCycle = 0; phase = 0; S.prep = null; marcarInicio(); falar(texto + ' Começa!', true); painelTreino(); return; }
    fotografarPose();
    S.estado = 'preparo'; t = 0; lastCycle = 0; phase = 0;
    const tok = {}, est = texto.length * 70; // ~70 ms por letra na voz em português
    S.prep = { tok, etapa: 'anuncio', t0: agora(), min: est * 0.75, max: 2500 + est * 1.6, terminou: false };
    const falou = falar(texto, true, false, () => { if (S.prep && S.prep.tok === tok && S.prep.etapa === 'anuncio') S.prep.terminou = true; });
    if (!falou) { S.prep.min = 2500; S.prep.terminou = true; } // sem voz: espera uns segundos parado
    painelTreino();
  }
  function dizerComeca() {
    if (!S.prep) S.prep = { tok: {} };
    const tok = S.prep.tok;
    Object.assign(S.prep, { etapa: 'comeca', t0: agora(), min: 600, max: 2200, terminou: false });
    const falou = falar('Começa!', true, false, () => { if (S.prep && S.prep.tok === tok && S.prep.etapa === 'comeca') S.prep.terminou = true; });
    if (!falou) { S.prep.min = 500; S.prep.terminou = true; }
  }
  function conferirPreparo() {
    const pr = S.prep; if (!pr) return;
    const el = agora() - pr.t0;
    if ((pr.terminou && el >= pr.min) || el >= pr.max) {
      if (pr.etapa === 'anuncio') dizerComeca();
      else if (pr.etapa === 'conclui') { const f = pr.depois; S.prep = null; f(); }
      else comecarContagem();
    }
  }
  // fim de ciclo/exercício: continua de pé na posição inicial até a voz terminar de avisar;
  // só então senta para descansar (ou segue)
  function concluir(texto, depois) {
    if (window.__semPreparo) { falar(texto, true); depois(); return; }
    S.estado = 'concluindo'; t = 0; phase = 0; S.espera = 0;
    const tok = {}, est = texto.length * 70;
    S.prep = { tok, etapa: 'conclui', t0: agora(), min: est * 0.75, max: 2500 + est * 1.6, terminou: false, depois };
    const falou = falar(texto, true, false, () => { if (S.prep && S.prep.tok === tok) S.prep.terminou = true; });
    if (!falou) { S.prep.min = 1200; S.prep.terminou = true; }
    painelTreino();
  }
  function irDescansar(seg) {
    fotografarPose(); S.estado = 'descanso'; S.resto = seg; S.restoInt = Math.ceil(seg); aimCamera(REPOUSO.cam); musicaNova = true;
    painelTreino();
  }
  function comecarContagem() {
    S.prep = null; S.estado = 'treino'; t = 0; lastCycle = 0; phase = 0; marcarInicio();
    painelTreino();
  }
  // tempo do exercício para o histórico: começa no primeiro "Começa!", desconta as pausas
  function marcarInicio() { if (!S.reg) S.reg = { inicio: Date.now(), pausadoMs: 0, pausaDesde: null }; }
  function registroDoExercicio() {
    const r = S.reg || { inicio: Date.now(), pausadoMs: 0 }, fim = Date.now();
    return {
      id: 'h' + fim.toString(36) + Math.random().toString(36).slice(2, 5), ex: cur.id, nome: cur.nome,
      treino: SEQ ? { id: SEQ.t.id, nome: SEQ.t.nome } : null, dia: hojeStr(new Date(r.inicio)),
      inicio: r.inicio, fim, ativoSeg: Math.max(0, Math.round((fim - r.inicio - (r.pausadoMs || 0)) / 1000)),
      ciclos: tc.ciclos, reps: tc.reps, iso: !!cur.isometria, ritmo: tc.ritmo, ritmoNome: ritmoNome(tc.ritmo),
      descanso: tc.descanso, caneleira: usaCaneleira() ? cfg.caneleira : 0
    };
  }
  function resetTreino(silencioso) {
    if ((S.estado === 'descanso' || (S.estado === 'pausado' && S.antes === 'descanso')) && !cur.repouso) { fotografarPose(); bestAngle(false); }
    S.estado = 'previa'; S.ciclo = 1; S.rep = 0; S.resto = 0; t = 0; lastCycle = 0; S.espera = 0; S.troca = false; S.prep = null;
    if (!silencioso) calarVoz();
    painelTreino();
  }
  function proximoCiclo() {
    if (S.troca) { proximoExercicio(); return; }
    if (S.estado === 'descanso' || S.estado === 'pausado') { fotografarPose(); bestAngle(false); }
    S.ciclo++; S.espera = 0; S.rep = 0;
    preparar('Ciclo ' + S.ciclo + ' de ' + tc.ciclos + '.');
  }
  function repCompleta() {
    S.rep++;
    if (S.rep >= tc.reps) {
      t = 0; lastCycle = 0; phase = 0;
      if (S.ciclo >= tc.ciclos) {
        const reg = registroDoExercicio(); S.reg = null;
        if (SEQ && SEQ.idx < SEQ.t.itens.length - 1) {
          // treino montado: pergunta ao fim de CADA exercício (se for interrompido depois, o que já fez fica registrado);
          // só depois da resposta começa o descanso até o próximo
          const dep = tc.depois || 0, prox = nomeEx(SEQ.t.itens[SEQ.idx + 1].ex), seq0 = SEQ;
          S.troca = true;
          concluir(S.rep + '. Fim do exercício. Você concluiu?', () => {
            S.estado = 'pergunta'; painelTreino();
            perguntarConclusao([reg], registrou => {
              if (SEQ !== seq0 || S.estado !== 'pergunta') return; // saiu do treino enquanto respondia
              const ini = registrou ? 'Registrado. ' : 'Certo, não registrado. ';
              if (dep > 0) { falar(ini + 'Descanse ' + dep + ' segundos. Depois: ' + prox + '.', true); irDescansar(dep); }
              else { falar(ini, true); proximoExercicio(); }
            });
          });
          return;
        } else {
          // em vez de afirmar, pergunta: só entra no histórico se a pessoa confirmar
          S.estado = 'fim';
          falar(S.rep + (SEQ ? '. Fim do treino ' + SEQ.t.nome + '. Você concluiu este último exercício?' : '. Fim do exercício. Você concluiu o exercício?'), true);
          perguntarConclusao([reg]);
        }
      } else if (tc.descanso > 0) {
        concluir(S.rep + '. Ciclo ' + S.ciclo + ' concluído. Descanse ' + tc.descanso + ' segundos.', () => irDescansar(tc.descanso));
        return;
      } else {
        concluir(S.rep + '. Ciclo ' + S.ciclo + ' concluído.', proximoCiclo);
        return;
      }
    } else {
      if (!cur.isometria && tc.reps >= 4 && S.rep === tc.reps - 1) falar(S.rep + '. Mais uma!', true);
      else falar(String(S.rep), true);
      if (tc.pausaRep > 0 && !cur.isometria) S.espera = tc.pausaRep;
    }
    painelTreino();
  }
  function passo(dt) {
    if (S.estado === 'preparo' || S.estado === 'concluindo' || S.estado === 'pergunta') {
      // parado na posição inicial, com um leve balanço de quem está pronto
      t += dt; phase = 0.035 * (1 - Math.cos(2 * Math.PI * t / 2.6)) / 2; lado = 0;
      conferirPreparo();
    } else if (S.estado === 'treino' && S.espera > 0) {
      S.espera -= dt; phase = 0;
      if (S.espera <= 0) { S.espera = 0; painelTreino(); }
    } else if (S.estado === 'previa' || S.estado === 'treino') {
      t += dt;
      const per = cur.isometria ? 1 : cur.periodo * tc.ritmo;
      phase = (1 - Math.cos(2 * Math.PI * t / per)) / 2;
      const cyc = Math.floor(t / per);
      if (cyc > lastCycle) { lastCycle = cyc; if (S.estado === 'treino') repCompleta(); }
      lado = cur.alt ? Math.floor(t / per) % 2 : 0;
    } else if (S.estado === 'descanso') {
      S.resto -= dt;
      const n = Math.ceil(S.resto);
      if (n !== S.restoInt) {
        S.restoInt = n;
        if (n >= 1 && n <= 3) falar(String(n), true);
        else if (n === 10 && tc.descanso > 15) falar('Dez segundos.', true);
        painelTreino();
      }
      if (S.resto <= 0) proximoCiclo();
      else if (S.troca && n === Math.ceil(tc.depois || 0) - 1 && n > 4) falar('Prepare-se para ' + nomeEx(SEQ.t.itens[SEQ.idx + 1].ex) + '.', true);
    }
  }
  $('bPlay').addEventListener('click', () => {
    if (window.Musica) Musica.desbloquear();
    if (cur.repouso) { abrirTreinos(); return; }
    if (S.estado === 'fim' && SEQ) { executarTreino(SEQ.t.id); return; }
    if (S.estado === 'previa' || S.estado === 'fim' || S.estado === 'congelado') iniciarTreino();
    else if (S.estado === 'treino' || S.estado === 'descanso' || S.estado === 'preparo' || S.estado === 'concluindo' || S.estado === 'pergunta') { S.antes = S.estado; S.estado = 'pausado'; if (S.reg) S.reg.pausaDesde = Date.now(); calarVoz(); painelTreino(); }
    else if (S.estado === 'pausado') {
      if (S.reg && S.reg.pausaDesde) { S.reg.pausadoMs += Date.now() - S.reg.pausaDesde; S.reg.pausaDesde = null; }
      if (S.antes === 'preparo') { S.estado = 'preparo'; dizerComeca(); painelTreino(); return; }
      if (S.antes === 'concluindo') { const f = S.prep && S.prep.depois; S.prep = null; if (f) f(); else proximoCiclo(); return; }
      S.estado = S.antes; if (S.estado === 'treino') falar('Continuando.', true); painelTreino();
      if (S.estado === 'pergunta' && concPend) $('concBox').hidden = false;
    }
  });
  $('bReset').addEventListener('click', () => resetTreino(false));
  // parar: pausa e mostra as opções (continuar, encerrar, recomeçar)
  $('bParar').addEventListener('click', () => { if (S.estado !== 'pausado') $('bPlay').click(); });
  $('bContinuar').addEventListener('click', () => { if (S.estado === 'pausado') $('bPlay').click(); });
  $('bRecomecarEx').addEventListener('click', () => { if (window.Musica) Musica.desbloquear(); resetTreino(false); iniciarTreino(); });
  $('bEncerrar').addEventListener('click', encerrarTreino);
  function encerrarTreino() {
    calarVoz();
    const pend = concPend; // pergunta ainda sem resposta: continua na tela para poder registrar
    if (SEQ) sairSequencia(false); // treino montado: volta para o descanso (sentado)
    else resetTreino(true);         // exercício avulso: volta para a prévia do exercício
    if (pend) { perguntarConclusao(pend.map(r => { const o = Object.assign({}, r); delete o.marcado; return o; })); falar('Treino encerrado. Você concluiu o último exercício?', true); }
    else falar('Treino encerrado.', true);
  }
  // modo imersivo: durante o treino as informações recolhem e os controles ficam transparentes;
  // um toque na tela deixa tudo visível por alguns segundos
  const BC = document.body.classList;
  let toqueTimer = 0, revelarSo = false;
  function modoImersivo(on, rodando) {
    if (!on && BC.contains('imersivo')) { BC.remove('infoAberta'); $('bRecolher').setAttribute('aria-expanded', 'false'); }
    const mudou = BC.contains('imersivo') !== on;
    BC.toggle('imersivo', on); BC.toggle('rodando', !!rodando);
    if (mudou) { resize(); setTimeout(resize, 420); }
  }
  function mostrarControles(e) {
    if (!BC.contains('imersivo')) return;
    // com os controles apagados, o primeiro toque no corpo só faz eles aparecerem (não seleciona músculo)
    revelarSo = BC.contains('rodando') && !BC.contains('toque') && !BC.contains('infoAberta') && !BC.contains('musAberto') && e && e.target === renderer.domElement;
    BC.add('toque'); clearTimeout(toqueTimer);
    toqueTimer = setTimeout(() => BC.remove('toque'), 4000);
  }
  document.addEventListener('pointerdown', mostrarControles, true);
  $('bRecolher').addEventListener('click', () => {
    const ab = BC.toggle('infoAberta');
    $('bRecolher').setAttribute('aria-expanded', String(ab));
    $('bRecolher').setAttribute('aria-label', ab ? 'Esconder informações do exercício' : 'Mostrar informações do exercício');
  });
  // ficha do músculo aberta durante o treino: painel fica opaco para dar leitura
  new MutationObserver(() => BC.toggle('musAberto', !$('cardMus').hidden)).observe($('cardMus'), { attributes: true, attributeFilter: ['hidden'] });
  // ⏮ ⏭: dentro de um treino montado andam entre os exercícios dele;
  // fora, andam pelos exercícios do catálogo (na mesma ordem dos chips)
  const listaNavegacao = () => EXERCICIOS.filter(e => !e.repouso).map(e => e.id);
  function navegar(d) {
    if (window.Musica) Musica.desbloquear();
    calarVoz();
    if (SEQ) {
      const j = SEQ.idx + d;
      if (j < 0) { aplicarItem(); iniciarTreino(); return; }          // no primeiro: recomeça
      if (j >= SEQ.t.itens.length) { S.troca = false; S.estado = 'fim'; falar('Treino ' + SEQ.t.nome + ' concluído. Parabéns!', true); painelTreino(); return; }
      SEQ.idx = j; S.troca = false; aplicarItem(); iniciarTreino(); return;
    }
    const l = listaNavegacao();
    if (cur.repouso) { setExercise(l[d > 0 ? 0 : l.length - 1]); return; }
    const j = l.indexOf(cur.id) + d;
    if (j >= 0 && j < l.length) setExercise(l[j]);
  }
  $('bPrev').addEventListener('click', () => navegar(-1));
  $('bNext').addEventListener('click', () => navegar(1));
  $('bEscolher').addEventListener('click', () => abrirTreinos());
  $('bSkip').addEventListener('click', () => { if (S.estado === 'descanso' || S.estado === 'pausado') proximoCiclo(); });

  // configuração
  let rascunho = null;
  function cfgUI() {
    for (const k of ['reps', 'ciclos', 'descanso', 'pausaRep', 'depois']) if (rascunho[k] !== undefined) $('v_' + k).textContent = String(rascunho[k]) + (k === 'reps' ? (cfgIso ? ' s' : '') : k === 'ciclos' ? '' : ' s');
    for (const o of $('cRitmo').children) o.classList.toggle('on', Number(o.dataset.v) === rascunho.ritmo);
    for (const o of $('cCan').children) o.classList.toggle('on', Number(o.dataset.v) === rascunho.caneleira);
    try { movUI(); } catch (e) { /* ainda iniciando */ }
    $('cVoz').checked = rascunho.voz;
  }
  for (const btn of document.querySelectorAll('.stp button')) {
    btn.addEventListener('click', () => {
      const k = btn.parentElement.dataset.k, d = Number(btn.dataset.d), L = LIM[k];
      rascunho[k] = clamp(rascunho[k] + d * L[2], L[0], L[1]); cfgUI();
    });
  }
  for (const o of $('cRitmo').children) o.addEventListener('click', () => { rascunho.ritmo = Number(o.dataset.v); cfgUI(); });
  for (const o of $('cCan').children) o.addEventListener('click', () => { rascunho.caneleira = Number(o.dataset.v); cfgUI(); });
  // movimento do corpo: vale na hora e para todos os exercícios (preferência do perfil)
  function movUI() { for (const o of $('cMov').children) o.classList.toggle('on', o.dataset.v === (movNatural() ? 'natural' : 'estatico')); }
  for (const o of $('cMov').children) o.addEventListener('click', () => {
    const antes = CAMCFG.mov; CAMCFG.mov = o.dataset.v;
    if (!gravarCamCfg()) { CAMCFG.mov = antes; $('cfgMsg').textContent = 'Atenção: não consegui salvar o movimento do corpo neste aparelho.'; }
    movUI();
  });
  $('cVoz').addEventListener('change', e => { rascunho.voz = e.target.checked; });
  $('bTestVoz').addEventListener('click', () => {
    if (!VOZ_OK) { $('cfgMsg').textContent = 'Este navegador não tem leitura em voz alta. O contador na tela continua funcionando.'; return; }
    $('cfgMsg').textContent = vozPt ? '' : 'Não encontrei uma voz em português neste aparelho; vou usar a voz padrão.';
    falar('Um, dois, três. Ciclo um de três.', true, true);
  });
  // dentro de um treino montado, os Ajustes mexem no exercício que está na tela,
  // e ao salvar o treino guardado também muda
  let cfgItem = null, cfgIso = false;
  $('bCfg').addEventListener('click', () => {
    cfgItem = SEQ ? SEQ.t.itens[SEQ.idx] : null;
    cfgIso = !!(cfgItem && cur.isometria);
    rascunho = Object.assign({}, cfg);
    if (cfgItem) Object.assign(rascunho, { reps: cfgItem.reps, ciclos: cfgItem.ciclos, descanso: cfgItem.descanso, ritmo: cfgItem.ritmo, pausaRep: cfgItem.pausaRep, depois: cfgItem.depois });
    else { delete rascunho.pausaRep; delete rascunho.depois; }
    const ultimo = !SEQ || SEQ.idx >= SEQ.t.itens.length - 1;
    $('cfgTitulo').textContent = cfgItem ? 'Ajustar este exercício' : 'Configurar treino';
    $('cfgSub').hidden = !cfgItem;
    if (cfgItem) $('cfgSub').textContent = cur.nome + ' · treino "' + SEQ.t.nome + '". Ao salvar, o treino guardado também muda.';
    $('cfgRepsNome').textContent = cfgIso ? 'Segundos' : 'Repetições';
    $('rowPausaRep').hidden = !cfgItem || cur.isometria;
    $('rowDepois').hidden = !cfgItem || ultimo;
    if (cfgItem && !ultimo) $('cfgDepoisSub').textContent = 'antes de ' + nomeEx(SEQ.t.itens[SEQ.idx + 1].ex);
    $('cfgMsg').textContent = VOZ_OK ? '' : 'Este navegador não tem leitura em voz alta.';
    cfgUI(); $('cfgSheet').hidden = false;
  });
  $('bCfgClose').addEventListener('click', () => { $('cfgSheet').hidden = true; });
  $('bCfgSave').addEventListener('click', () => {
    const ritmoAntes = tc.ritmo;
    let ok = true, okTreino = true;
    if (cfgItem && SEQ && SEQ.t.itens[SEQ.idx] === cfgItem) {
      // voz e caneleira continuam gerais; o resto vai para o exercício do treino
      cfg = Object.assign({}, cfg, { voz: rascunho.voz, caneleira: rascunho.caneleira });
      ok = salvarCfg(cfg);
      const novo = { reps: rascunho.reps, ciclos: rascunho.ciclos, descanso: rascunho.descanso, ritmo: rascunho.ritmo, pausaRep: rascunho.pausaRep, depois: rascunho.depois };
      const lista = TREINOS.map(tr => tr.id !== SEQ.t.id ? tr : Object.assign({}, tr, { alterado: Date.now(), itens: tr.itens.map((it, i) => i === SEQ.idx ? Object.assign({}, it, novo) : it) }));
      okTreino = gravarTreinos(lista);
      if (okTreino) { TREINOS = lista; SEQ.t = TREINOS.find(tr => tr.id === SEQ.t.id); }
      else Object.assign(SEQ.t.itens[SEQ.idx], novo); // vale agora, mesmo sem gravar
      tc = Object.assign({}, cfg, novo);
    } else {
      cfg = Object.assign({}, rascunho); delete cfg.pausaRep; delete cfg.depois;
      ok = salvarCfg(cfg);
      if (!SEQ) tc = cfg;
    }
    // mudou o ritmo no meio: continua do mesmo ponto do movimento, só que na velocidade nova
    if (tc.ritmo !== ritmoAntes && ritmoAntes > 0) { t = t * tc.ritmo / ritmoAntes; }
    if (!cfg.voz) calarVoz();
    escalaCaneleira(cfg.caneleira);
    painelTreino();
    if (ok && okTreino) { $('cfgSheet').hidden = true; cfgItem = null; }
    else if (!okTreino) $('cfgMsg').textContent = 'Atenção: não consegui gravar no treino guardado. O ajuste vale só para agora.';
    else $('cfgMsg').textContent = 'Atenção: não consegui gravar neste aparelho. A configuração vale só até fechar o app.';
  });

  /* =====================================================================
   * 9. MEUS TREINOS (sequências salvas) e TRILHA SONORA
   * ===================================================================== */
  const TREINOS_KEY = chave('corpo3d.treinos.v1'), MUSICA_KEY = chave('corpo3d.musica.v1');
  const LIM_IT = { reps: [1, 50, 1], ciclos: [1, 10, 1], descanso: [0, 300, 5], pausaRep: [0, 30, 1], depois: [0, 300, 5] };
  const RITMOS = [[1.45, 'Lento'], [1, 'Normal'], [0.7, 'Rápido'], [0.5, 'Turbo']];
  const TRILHAS = [['padrao', 'Padrão'], ['app', 'Som do app'], ['minhas', 'Minhas músicas'], ['off', 'Sem música']];
  const exPorId = id => EXERCICIOS.find(e => e.id === id);
  const nomeEx = id => { const e = exPorId(id); return e ? e.nome : 'Exercício removido'; };
  const ritmoNome = r => (RITMOS.find(x => x[0] === r) || RITMOS[1])[1];
  let musicaNova = false;

  function itemPadrao(exId) {
    const ex = exPorId(exId);
    return { ex: exId, reps: ex && ex.isometria ? 30 : cfg.reps, ciclos: cfg.ciclos, descanso: cfg.descanso, pausaRep: 0, ritmo: cfg.ritmo, depois: 60 };
  }
  function limparItem(o) {
    const it = itemPadrao(o && o.ex);
    if (!o || !exPorId(o.ex)) return null;
    for (const k in LIM_IT) { const v = Math.round(Number(o[k])); if (Number.isFinite(v)) it[k] = clamp(v, LIM_IT[k][0], LIM_IT[k][1]); }
    if (RITMOS.some(r => r[0] === Number(o.ritmo))) it.ritmo = Number(o.ritmo);
    return it;
  }
  function limparTreino(o) {
    if (!o || typeof o !== 'object') return null;
    const itens = (Array.isArray(o.itens) ? o.itens : []).map(limparItem).filter(Boolean);
    return { id: String(o.id || ('t' + Date.now().toString(36))), nome: String(o.nome || 'Meu treino').slice(0, 60), trilha: TRILHAS.some(x => x[0] === o.trilha) ? o.trilha : 'padrao', itens, criado: o.criado || Date.now(), alterado: o.alterado || Date.now() };
  }
  let treinosErro = '';
  function lerTreinos() {
    treinosErro = '';
    let raw = null;
    try { raw = localStorage.getItem(TREINOS_KEY); } catch (e) { treinosErro = 'Não consegui ler os treinos salvos neste aparelho.'; return []; }
    if (!raw) return [];
    try { const o = JSON.parse(raw); return (Array.isArray(o.lista) ? o.lista : []).map(limparTreino).filter(Boolean); }
    catch (e) {
      // não apaga o que estava gravado: guarda uma cópia para não perder nada
      try { localStorage.setItem(TREINOS_KEY + '.corrompido.' + Date.now(), raw); } catch (e2) { /* ok */ }
      treinosErro = 'Os treinos salvos estavam danificados. Guardei uma cópia de segurança e comecei uma lista nova.';
      return [];
    }
  }
  function gravarTreinos(lista) {
    try {
      const txt = JSON.stringify({ v: 1, lista });
      localStorage.setItem(TREINOS_KEY, txt);
      return localStorage.getItem(TREINOS_KEY) === txt;
    } catch (e) { return false; }
  }
  let TREINOS = lerTreinos();
  function duracao(tr) {
    let s = 0;
    tr.itens.forEach((it, i) => {
      const ex = exPorId(it.ex); if (!ex) return;
      const rep = ex.isometria ? 1 : ex.periodo * it.ritmo;
      s += it.ciclos * it.reps * rep + (it.ciclos - 1) * it.descanso + (ex.isometria ? 0 : it.ciclos * (it.reps - 1) * it.pausaRep);
      if (i < tr.itens.length - 1) s += it.depois;
    });
    return s;
  }
  const minTxt = s => s < 60 ? Math.round(s) + ' s' : '~' + Math.round(s / 60) + ' min';
  const itemTxt = it => { const ex = exPorId(it.ex); return it.reps + (ex && ex.isometria ? ' s' : ' reps') + ' · ' + it.ciclos + (it.ciclos > 1 ? ' ciclos' : ' ciclo') + ' · desc. ' + it.descanso + ' s' + (it.pausaRep ? ' · pausa ' + it.pausaRep + ' s' : '') + ' · ' + ritmoNome(it.ritmo).toLowerCase(); };
  const svg = p => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  const IC = {
    play: svg('<path d="M8 5l11 7-11 7z" fill="currentColor" stroke="none"/>'), edit: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>'),
    dup: svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'), del: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
    up: svg('<path d="M6 15l6-6 6 6"/>'), down: svg('<path d="M6 9l6 6 6-6"/>'), x: svg('<path d="M6 6l12 12M18 6L6 18"/>'), next: svg('<path d="M6 5l9 7-9 7z"/><path d="M18 5v14"/>'),
    swap: svg('<path d="M7 7h12l-3-3M17 17H5l3 3"/>'), stop: svg('<rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none"/>')
  };
  function botao(cls, html, rotulo, fn) {
    const b = document.createElement('button'); b.className = cls; b.innerHTML = html;
    if (rotulo) { b.setAttribute('aria-label', rotulo); b.title = rotulo; }
    b.addEventListener('click', e => { e.stopPropagation(); fn(b, e); }); return b;
  }
  // botão que pede um segundo toque para confirmar (apagar, descartar)
  function confirmar(b, texto, fn) {
    if (b.dataset.conf === '1') { fn(); return; }
    const antes = b.innerHTML; b.dataset.conf = '1'; b.classList.add('perigo'); b.textContent = texto;
    setTimeout(() => { if (b.isConnected) { b.dataset.conf = ''; b.classList.remove('perigo'); b.innerHTML = antes; } }, 3500);
  }

  /* ---------- lista de treinos ---------- */
  function renderTreinos(msg) {
    const box = $('trList'); box.innerHTML = '';
    $('trMsg').textContent = msg || treinosErro || '';
    if (!TREINOS.length) {
      const p = document.createElement('p'); p.className = 'empty';
      p.textContent = 'Nenhum treino ainda. Monte uma sequência de exercícios com as repetições, ciclos e pausas de cada um.'; box.appendChild(p);
    }
    for (const tr of TREINOS) {
      const c = document.createElement('div'); c.className = 'trc';
      const tx = document.createElement('div'); tx.className = 'trt';
      const b = document.createElement('b'); b.textContent = tr.nome; tx.appendChild(b);
      const sm = document.createElement('small');
      sm.textContent = tr.itens.length + (tr.itens.length === 1 ? ' exercício' : ' exercícios') + ' · ' + minTxt(duracao(tr)) + ' · ' + (TRILHAS.find(x => x[0] === tr.trilha) || TRILHAS[0])[1].toLowerCase();
      tx.appendChild(sm);
      const sp = document.createElement('span'); sp.textContent = tr.itens.map(i => nomeEx(i.ex)).join(' · '); tx.appendChild(sp);
      c.appendChild(tx);
      const ac = document.createElement('div'); ac.className = 'tra';
      ac.appendChild(botao('pill on trPlay', IC.play + '<span>Iniciar</span>', 'Iniciar ' + tr.nome, () => { $('trSheet').hidden = true; executarTreino(tr.id); }));
      ac.appendChild(botao('ic sm', IC.edit, 'Editar ' + tr.nome, () => abrirEditor(tr.id)));
      ac.appendChild(botao('ic sm', IC.dup, 'Duplicar ' + tr.nome, () => duplicarTreino(tr.id)));
      ac.appendChild(botao('ic sm', IC.del, 'Apagar ' + tr.nome, bt => confirmar(bt, 'Apagar?', () => apagarTreino(tr.id))));
      c.appendChild(ac); box.appendChild(c);
    }
  }
  function abrirTreinos() { renderTreinos(); $('trTitulo').textContent = 'Escolher'; $('trSheet').hidden = false; }
  function salvarLista(nova, okMsg) {
    if (!gravarTreinos(nova)) { renderTreinos('Atenção: não consegui gravar neste aparelho. Nada foi alterado.'); return false; }
    TREINOS = nova; renderTreinos(okMsg); return true;
  }
  function duplicarTreino(id) {
    const tr = TREINOS.find(x => x.id === id); if (!tr) return;
    const c = JSON.parse(JSON.stringify(tr)); c.id = 't' + Date.now().toString(36); c.nome = (tr.nome + ' (cópia)').slice(0, 60); c.criado = c.alterado = Date.now();
    const l = TREINOS.slice(); l.splice(TREINOS.indexOf(tr) + 1, 0, c); salvarLista(l, 'Treino duplicado.');
  }
  function apagarTreino(id) {
    if (SEQ && SEQ.t.id === id) sairSequencia(false);
    salvarLista(TREINOS.filter(x => x.id !== id), 'Treino apagado.');
  }

  /* ---------- editor de treino ---------- */
  let ED = null; // { t: rascunho, orig: json do original, aberto: índice expandido }
  function abrirEditor(id) {
    const tr = id ? TREINOS.find(x => x.id === id) : null;
    const t0 = tr ? JSON.parse(JSON.stringify(tr)) : { id: 't' + Date.now().toString(36), nome: '', trilha: 'padrao', itens: [], criado: Date.now(), alterado: Date.now() };
    ED = { t: t0, orig: JSON.stringify(t0), novo: !tr, aberto: -1 };
    $('edTitulo').textContent = tr ? 'Editar treino' : 'Novo treino';
    $('edNome').value = t0.nome; $('edMsg').textContent = '';
    renderEditor(); $('edSheet').hidden = false;
  }
  function renderEditor() {
    const t0 = ED.t;
    for (const o of $('edTrilha').children) o.classList.toggle('on', o.dataset.v === t0.trilha);
    const box = $('edItens'); box.innerHTML = '';
    t0.itens.forEach((it, i) => {
      const ex = exPorId(it.ex), c = document.createElement('div'); c.className = 'edi' + (ED.aberto === i ? ' aberto' : '');
      const top = document.createElement('div'); top.className = 'edt';
      const n = document.createElement('span'); n.className = 'edn'; n.textContent = String(i + 1); top.appendChild(n);
      const tx = document.createElement('div'); tx.className = 'trt';
      const b = document.createElement('b'); b.textContent = nomeEx(it.ex); tx.appendChild(b);
      const sm = document.createElement('small'); sm.textContent = itemTxt(it); tx.appendChild(sm);
      top.appendChild(tx);
      top.appendChild(botao('ic sm', IC.up, 'Subir', () => moverItem(i, -1)));
      top.appendChild(botao('ic sm', IC.down, 'Descer', () => moverItem(i, 1)));
      top.appendChild(botao('ic sm', IC.del, 'Tirar ' + nomeEx(it.ex), bt => confirmar(bt, 'Tirar?', () => { t0.itens.splice(i, 1); ED.aberto = -1; renderEditor(); })));
      top.addEventListener('click', () => { ED.aberto = ED.aberto === i ? -1 : i; renderEditor(); });
      c.appendChild(top);
      if (ED.aberto === i) {
        const f = document.createElement('div'); f.className = 'edf';
        const linha = (k, rot, sub, un) => {
          const r = document.createElement('div'); r.className = 'cr';
          const lb = document.createElement('div'); lb.className = 'lb'; lb.textContent = rot;
          if (sub) { const s2 = document.createElement('small'); s2.textContent = sub; lb.appendChild(s2); }
          const st2 = document.createElement('div'); st2.className = 'stp';
          const out = document.createElement('output'); out.textContent = it[k] + (un || '');
          const L = LIM_IT[k];
          st2.appendChild(botao('', '−', 'Menos ' + rot.toLowerCase(), () => { it[k] = clamp(it[k] - L[2], L[0], L[1]); out.textContent = it[k] + (un || ''); sm.textContent = itemTxt(it); }));
          st2.appendChild(out);
          st2.appendChild(botao('', '+', 'Mais ' + rot.toLowerCase(), () => { it[k] = clamp(it[k] + L[2], L[0], L[1]); out.textContent = it[k] + (un || ''); sm.textContent = itemTxt(it); }));
          st2.dataset.k = k;
          r.appendChild(lb); r.appendChild(st2); f.appendChild(r);
        };
        if (ex && ex.isometria) linha('reps', 'Segundos', 'tempo segurando a posição', ' s'); else linha('reps', 'Repetições', 'por ciclo');
        linha('ciclos', 'Ciclos', 'séries deste exercício');
        linha('descanso', 'Descanso', 'entre um ciclo e outro', ' s');
        if (!(ex && ex.isometria)) linha('pausaRep', 'Pausa', 'entre uma repetição e outra', ' s');
        const r = document.createElement('div'); r.className = 'cr';
        const lb = document.createElement('div'); lb.className = 'lb'; lb.textContent = 'Ritmo'; r.appendChild(lb);
        const sg = document.createElement('div'); sg.className = 'seg';
        for (const [v, nm] of RITMOS) { const o = botao(it.ritmo === v ? 'on' : '', nm, null, () => { it.ritmo = v; for (const x of sg.children) x.classList.toggle('on', x === o); sm.textContent = itemTxt(it); }); sg.appendChild(o); }
        r.appendChild(sg); f.appendChild(r);
        if (i < t0.itens.length - 1) linha('depois', 'Descanso até o próximo', 'antes de ' + nomeEx(t0.itens[i + 1].ex), ' s');
        const tr2 = document.createElement('div'); tr2.className = 'edb';
        tr2.appendChild(botao('lk', 'Trocar exercício', null, () => abrirCatalogo(id2 => { it.ex = id2; const e2 = exPorId(id2); if (e2 && e2.isometria && it.reps < 10) it.reps = 30; renderEditor(); })));
        tr2.appendChild(botao('lk', 'Duplicar', null, () => { t0.itens.splice(i + 1, 0, Object.assign({}, it)); ED.aberto = i + 1; renderEditor(); }));
        f.appendChild(tr2);
        c.appendChild(f);
      }
      box.appendChild(c);
    });
    if (!t0.itens.length) { const p = document.createElement('p'); p.className = 'empty'; p.style.marginTop = '14px'; p.textContent = 'Adicione os exercícios na ordem em que quer fazer.'; box.appendChild(p); }
    $('edResumo').textContent = t0.itens.length ? t0.itens.length + (t0.itens.length === 1 ? ' exercício' : ' exercícios') + ' · ' + minTxt(duracao(t0)) : '';
  }
  function moverItem(i, d) {
    const l = ED.t.itens, j = i + d; if (j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]]; if (ED.aberto === i) ED.aberto = j; else if (ED.aberto === j) ED.aberto = i; renderEditor();
  }
  $('edNome').addEventListener('input', e => { ED.t.nome = e.target.value; });
  for (const o of $('edTrilha').children) o.addEventListener('click', () => { ED.t.trilha = o.dataset.v; renderEditor(); });
  $('bEdAdd').addEventListener('click', () => abrirCatalogo(id => { ED.t.itens.push(itemPadrao(id)); ED.aberto = ED.t.itens.length - 1; renderEditor(); requestAnimationFrame(() => { const l = $('edItens').lastChild; if (l && l.scrollIntoView) l.scrollIntoView({ block: 'nearest' }); }); }));
  $('bEdSave').addEventListener('click', () => {
    const t0 = ED.t; t0.nome = $('edNome').value.trim();
    if (!t0.nome) { $('edMsg').textContent = 'Dê um nome ao treino.'; $('edNome').focus(); return; }
    if (!t0.itens.length) { $('edMsg').textContent = 'Adicione pelo menos um exercício.'; return; }
    t0.alterado = Date.now();
    const limpo = limparTreino(t0);
    const l = TREINOS.slice(), i = l.findIndex(x => x.id === limpo.id);
    if (i >= 0) l[i] = limpo; else l.push(limpo);
    if (!gravarTreinos(l)) { $('edMsg').textContent = 'Atenção: não consegui gravar neste aparelho. Seu treino continua aberto aqui; tente de novo.'; return; }
    TREINOS = l;
    if (SEQ && SEQ.t.id === limpo.id) SEQ.t = limpo;
    $('edSheet').hidden = true; ED = null; renderTreinos(i >= 0 ? 'Alterações salvas.' : 'Treino criado.');
  });
  $('bEdClose').addEventListener('click', () => {
    if (ED && JSON.stringify(Object.assign({}, ED.t, { nome: $('edNome').value })) !== ED.orig && (ED.t.itens.length || $('edNome').value.trim())) {
      confirmar($('bEdClose'), 'Descartar?', () => { $('edSheet').hidden = true; ED = null; });
      return;
    }
    $('edSheet').hidden = true; ED = null;
  });

  /* ---------- Adicionar direto a um treino (prancheta com +) ----------
   * Do catálogo: escolhe o treino (ou cria um novo), ajusta repetições, ciclos e pausas
   * e volta para onde estava, para continuar navegando e adicionando. */
  const IC_PRANCHETA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="4.5" width="14" height="16.5" rx="2"/><path d="M9 4.5V3h6v1.5"/><path d="M9 10h6M9 13.5h6M9 17h3.5"/></svg>';
  const IC_PRANCHETA_MAIS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="4.5" width="14" height="16.5" rx="2"/><path d="M9 4.5V3h6v1.5"/><path d="M12 9.5v7.5M8.25 13.25h7.5"/></svg>';
  function botaoAddTreino(ex) {
    const b = document.createElement('span'); b.setAttribute('role', 'button'); b.tabIndex = 0; b.className = 'addTr';
    b.innerHTML = IC_PRANCHETA_MAIS; b.setAttribute('aria-label', 'Adicionar a um treino: ' + ex.nome); b.title = 'Adicionar a um treino';
    const agir = e => { e.stopPropagation(); e.preventDefault(); abrirAddTreino(ex); };
    b.addEventListener('click', agir); b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') agir(e); });
    b.addEventListener('pointerdown', e => e.stopPropagation());
    return b;
  }
  let AT = null; // { ex, etapa: 'escolher'|'ajustar', treinoId|null, novoNome, item }
  function abrirAddTreino(ex) { AT = { ex, etapa: 'escolher', treinoId: null, novoNome: '', item: itemPadrao(ex.id) }; renderAddTreino(); $('atSheet').hidden = false; }
  function fecharAddTreino() { $('atSheet').hidden = true; AT = null; }
  function renderAddTreino(msg) {
    const box = $('atCorpo'); box.innerHTML = '';
    $('atMsg').textContent = msg || '';
    $('atNome').textContent = AT.ex.nome;
    $('bAtVoltar').hidden = AT.etapa === 'escolher';
    if (AT.etapa === 'escolher') {
      $('atTitulo').textContent = 'Adicionar ao treino';
      if (!TREINOS.length) { const p = document.createElement('p'); p.className = 'nota'; p.style.margin = '0 0 8px'; p.textContent = 'Você ainda não tem treinos. Crie o primeiro:'; box.appendChild(p); }
      for (const tr of TREINOS) {
        const r = document.createElement('button'); r.className = 'atOp'; r.dataset.id = tr.id;
        const ic = document.createElement('span'); ic.className = 'atIc'; ic.innerHTML = IC_PRANCHETA; r.appendChild(ic);
        const tx = document.createElement('div'); tx.className = 'trt';
        const b = document.createElement('b'); b.textContent = tr.nome; tx.appendChild(b);
        const jaTem = tr.itens.filter(i => i.ex === AT.ex.id).length;
        const sm = document.createElement('small'); sm.textContent = tr.itens.length + (tr.itens.length === 1 ? ' exercício' : ' exercícios') + (jaTem ? ' · já tem este' + (jaTem > 1 ? ' (' + jaTem + '×)' : '') : ''); tx.appendChild(sm);
        r.appendChild(tx);
        r.addEventListener('click', () => { AT.treinoId = tr.id; AT.etapa = 'ajustar'; renderAddTreino(); });
        box.appendChild(r);
      }
      const nv = document.createElement('div'); nv.className = 'atNovo';
      const inp = document.createElement('input'); inp.className = 'inp'; inp.id = 'atNovoNome'; inp.maxLength = 60; inp.placeholder = 'Nome do novo treino'; inp.value = AT.novoNome;
      inp.addEventListener('input', () => { AT.novoNome = inp.value; });
      const criar = () => { const n = inp.value.trim(); if (!n) { $('atMsg').textContent = 'Dê um nome ao novo treino.'; inp.focus(); return; } AT.novoNome = n; AT.treinoId = null; AT.etapa = 'ajustar'; renderAddTreino(); };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') criar(); });
      nv.appendChild(inp);
      nv.appendChild(botao('atCriar', IC_PRANCHETA_MAIS + '<span>Novo treino</span>', 'Criar novo treino', criar));
      box.appendChild(nv);
      return;
    }
    // ajustar o exercício antes de adicionar
    const tr = AT.treinoId ? TREINOS.find(x => x.id === AT.treinoId) : null;
    $('atTitulo').textContent = tr ? 'Adicionar em "' + tr.nome + '"' : 'Novo treino "' + AT.novoNome + '"';
    const it = AT.item, ex = AT.ex, f = document.createElement('div'); f.className = 'edf atAjuste';
    const linha = (k, rot, sub, un) => {
      const r = document.createElement('div'); r.className = 'cr';
      const lb = document.createElement('div'); lb.className = 'lb'; lb.textContent = rot;
      if (sub) { const s2 = document.createElement('small'); s2.textContent = sub; lb.appendChild(s2); }
      const st2 = document.createElement('div'); st2.className = 'stp'; st2.dataset.k = k;
      const out = document.createElement('output'); out.textContent = it[k] + (un || '');
      const L = LIM_IT[k];
      st2.appendChild(botao('', '−', 'Menos ' + rot.toLowerCase(), () => { it[k] = clamp(it[k] - L[2], L[0], L[1]); out.textContent = it[k] + (un || ''); }));
      st2.appendChild(out);
      st2.appendChild(botao('', '+', 'Mais ' + rot.toLowerCase(), () => { it[k] = clamp(it[k] + L[2], L[0], L[1]); out.textContent = it[k] + (un || ''); }));
      r.appendChild(lb); r.appendChild(st2); f.appendChild(r);
    };
    if (ex.isometria) linha('reps', 'Segundos', 'tempo segurando a posição', ' s'); else linha('reps', 'Repetições', 'por ciclo');
    linha('ciclos', 'Ciclos', 'séries deste exercício');
    linha('descanso', 'Descanso', 'entre um ciclo e outro', ' s');
    if (!ex.isometria) linha('pausaRep', 'Pausa', 'entre uma repetição e outra', ' s');
    const r = document.createElement('div'); r.className = 'cr';
    const lb = document.createElement('div'); lb.className = 'lb'; lb.textContent = 'Ritmo'; r.appendChild(lb);
    const sg = document.createElement('div'); sg.className = 'seg'; sg.id = 'atRitmo';
    for (const [v, nm] of RITMOS) { const o = botao(it.ritmo === v ? 'on' : '', nm, null, () => { it.ritmo = v; for (const x of sg.children) x.classList.toggle('on', x === o); }); sg.appendChild(o); }
    r.appendChild(sg); f.appendChild(r);
    linha('depois', 'Descanso até o próximo', 'depois deste exercício', ' s');
    box.appendChild(f);
    const bt = document.createElement('div'); bt.className = 'btnLinha';
    bt.appendChild(botao('', 'Voltar', null, () => { AT.etapa = 'escolher'; renderAddTreino(); }));
    bt.appendChild(botao('pri', IC_PRANCHETA_MAIS + '<span>Adicionar</span>', 'Adicionar ao treino', confirmarAddTreino));
    box.appendChild(bt);
  }
  let atAvisoTm = 0;
  function confirmarAddTreino() {
    const item = limparItem(AT.item); if (!item) { renderAddTreino('Exercício inválido.'); return; }
    let lista, alvo;
    if (AT.treinoId) {
      lista = TREINOS.map(tr => tr.id !== AT.treinoId ? tr : Object.assign({}, tr, { alterado: Date.now(), itens: tr.itens.concat(item) }));
      alvo = lista.find(tr => tr.id === AT.treinoId);
      if (!alvo) { AT.etapa = 'escolher'; renderAddTreino('Esse treino não existe mais.'); return; }
    } else {
      alvo = limparTreino({ id: 't' + Date.now().toString(36), nome: AT.novoNome, trilha: 'padrao', itens: [item] });
      lista = TREINOS.concat(alvo);
    }
    if (!gravarTreinos(lista)) { renderAddTreino('Atenção: não consegui gravar neste aparelho. Nada foi alterado; tente de novo.'); return; }
    TREINOS = lista;
    if (SEQ && SEQ.t.id === alvo.id) SEQ.t = alvo;
    const nome = AT.ex.nome; fecharAddTreino();
    // volta para onde estava (catálogo ou prévia) com um aviso rápido
    $('exMsg').textContent = '✓ ' + nome + ' adicionado a "' + alvo.nome + '" (' + alvo.itens.length + (alvo.itens.length === 1 ? ' exercício)' : ' exercícios)');
    $('exMsg').classList.add('okMsg');
    clearTimeout(atAvisoTm); atAvisoTm = setTimeout(() => { $('exMsg').textContent = ''; $('exMsg').classList.remove('okMsg'); }, 3500);
  }
  $('bAtFechar').addEventListener('click', fecharAddTreino);
  $('bAtVoltar').addEventListener('click', () => { if (AT) { AT.etapa = 'escolher'; renderAddTreino(); } });
  $('atSheet').addEventListener('click', e => { if (e.target.id === 'atSheet') fecharAddTreino(); });

  /* ---------- executar uma sequência ---------- */
  function aplicarItem() {
    const it = SEQ.t.itens[SEQ.idx];
    tc = Object.assign({}, cfg, { reps: it.reps, ciclos: it.ciclos, descanso: it.descanso, ritmo: it.ritmo, pausaRep: it.pausaRep, depois: it.depois });
    setExercise(it.ex, false, true);
  }
  function executarTreino(id) {
    const tr = TREINOS.find(x => x.id === id);
    if (!tr || !tr.itens.length) return false;
    if (window.Musica) { Musica.desbloquear(); Musica.parar(true); }
    SEQ = { t: tr, idx: 0, feitos: [] };
    aplicarItem(); iniciarTreino();
    return true;
  }
  function proximoExercicio() {
    if (!SEQ) return;
    if (SEQ.idx >= SEQ.t.itens.length - 1) { S.troca = false; S.estado = 'fim'; falar('Treino ' + SEQ.t.nome + ' concluído. Parabéns!', true); painelTreino(); return; }
    SEQ.idx++; S.troca = false;
    aplicarItem(); iniciarTreino();
  }
  function sairSequencia(silencioso) {
    if (!SEQ) return;
    SEQ = null; tc = cfg; S.troca = false;
    if (!silencioso) { calarVoz(); setExercise('repouso', false); }
  }
  function seqBarUI() {
    const bar = $('seqBar'); bar.hidden = !SEQ;
    if (!SEQ) return;
    $('seqNome').textContent = SEQ.t.nome;
    const prox = SEQ.t.itens[SEQ.idx + 1];
    $('seqSub').textContent = 'Exercício ' + (SEQ.idx + 1) + ' de ' + SEQ.t.itens.length + (prox ? ' · depois: ' + nomeEx(prox.ex) : ' · último');
  }
  $('bSeqSair').addEventListener('click', () => confirmar($('bSeqSair'), 'Sair?', () => sairSequencia(false)));
  $('bTreinos').addEventListener('click', abrirTreinos);
  $('bTrClose').addEventListener('click', () => { $('trSheet').hidden = true; });
  $('bTrNovo').addEventListener('click', () => abrirEditor(null));
  $('bTrAvulso').addEventListener('click', () => { $('trSheet').hidden = true; abrirCatalogo(); });
  $('bTrMusica').addEventListener('click', abrirMusica);

  /* ---------- tela acesa durante o treino ---------- */
  let wake = null, wakePedindo = false;
  function telaAcesa(on) {
    if (!('wakeLock' in navigator)) return;
    if (on && !wake && !wakePedindo && document.visibilityState === 'visible') {
      wakePedindo = true;
      navigator.wakeLock.request('screen').then(w => { wake = w; wakePedindo = false; w.addEventListener('release', () => { wake = null; }); }).catch(() => { wakePedindo = false; });
    } else if (!on && wake) { try { wake.release(); } catch (e) { /* ok */ } wake = null; }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') telaAcesa(S.estado === 'treino' || S.estado === 'descanso' || S.estado === 'pausado' || S.estado === 'preparo' || S.estado === 'concluindo'); });

  /* ---------- música acompanhando o treino ---------- */
  function lerMusicaCfg() {
    const c = { modo: 'app', vol: 0.7, abaixar: true };
    try { const o = JSON.parse(localStorage.getItem(MUSICA_KEY) || '{}') || {}; if (['app', 'minhas', 'off'].includes(o.modo)) c.modo = o.modo; if (Number.isFinite(o.vol)) c.vol = clamp(o.vol, 0, 1); if (typeof o.abaixar === 'boolean') c.abaixar = o.abaixar; } catch (e) { /* padrão */ }
    return c;
  }
  let mcfg = lerMusicaCfg();
  if (window.Musica) Musica.configurar(mcfg);
  function gravarMusicaCfg() {
    try { const tx = JSON.stringify(mcfg); localStorage.setItem(MUSICA_KEY, tx); return localStorage.getItem(MUSICA_KEY) === tx; } catch (e) { return false; }
  }
  function atualizarMusica() {
    if (!window.Musica) return;
    const modo = SEQ ? SEQ.t.trilha : 'padrao';
    if (cur.repouso && S.estado === 'previa') { Musica.parar(true); return; }
    if (S.estado === 'treino') { Musica.tocar('treino', { modo, nova: musicaNova, ritmo: tc.ritmo }); musicaNova = false; }
    else if (S.estado === 'preparo' || S.estado === 'pergunta') Musica.pausar();   // anunciando ou perguntando: espera
    else if (S.estado === 'concluindo') { /* segue tocando baixinho enquanto avisa o fim */ }
    else if (S.estado === 'descanso') { Musica.tocar('pausa', { modo, nova: musicaNova }); musicaNova = false; }
    else if (S.estado === 'pausado') Musica.pausar();
    else Musica.parar(S.estado === 'fim' || S.estado === 'previa');
  }

  /* ---------- tela de músicas ---------- */
  function fmtMB(b) { return (b / 1048576).toFixed(1).replace('.', ',') + ' MB'; }
  let muRender = 0;
  async function renderMusica(msg) {
    const eu = ++muRender;
    for (const o of $('muModo').children) o.classList.toggle('on', o.dataset.v === mcfg.modo);
    $('muVol').value = String(Math.round(mcfg.vol * 100));
    $('muAbaixar').checked = mcfg.abaixar;
    if (msg !== undefined) $('muMsg').textContent = msg;
    // estilos do som do app (para ouvir)
    for (const tipo of ['treino', 'pausa']) {
      const bx = $('muApp_' + tipo); bx.innerHTML = '';
      Musica.estilos(tipo).forEach((nm, i) => bx.appendChild(botao('chip', nm, 'Ouvir ' + nm, async b => {
        const e = Musica.estado(); const tocandoEsta = b.classList.contains('on');
        for (const x of document.querySelectorAll('#muSheet .chip.on, #muSheet .muPrev.on')) x.classList.remove('on');
        if (tocandoEsta && e.tocando) { Musica.parar(true); return; }
        await Musica.previa({ tipo, estilo: i }); b.classList.add('on');
      })));
    }
    let lista = [];
    try { lista = await Musica.listar(); } catch (e) { $('muMsg').textContent = (e && e.message) || 'Não consegui abrir as músicas guardadas.'; }
    if (eu !== muRender) return; // outro desenho mais novo já está a caminho
    for (const tipo of ['treino', 'pausa']) {
      const fs = lista.filter(f => f.lista === tipo), bx = $('muL_' + tipo); bx.innerHTML = '';
      $('muN_' + tipo).textContent = fs.length + '/' + Musica.MAX_POR_LISTA;
      $('bMuAdd_' + tipo).disabled = fs.length >= Musica.MAX_POR_LISTA;
      if (!fs.length) { const p = document.createElement('p'); p.className = 'muVazio'; p.textContent = 'Nenhuma música. Sem músicas aqui, o app usa o som dele.'; bx.appendChild(p); }
      fs.forEach((f, i) => {
        const r = document.createElement('div'); r.className = 'mur' + (f.falta ? ' falta' : '');
        r.appendChild(botao('ic sm muPrev', IC.play, 'Ouvir ' + f.nome, async b => {
          const on = b.classList.contains('on');
          for (const x of document.querySelectorAll('#muSheet .chip.on, #muSheet .muPrev.on')) { x.classList.remove('on'); if (x.classList.contains('muPrev')) x.innerHTML = IC.play; }
          if (on) { Musica.parar(true); return; }
          try { await Musica.previa(f); b.classList.add('on'); b.innerHTML = IC.stop; } catch (e) { $('muMsg').textContent = 'Não consegui tocar "' + f.nome + '". O formato pode não ser aceito por este aparelho.'; }
        }));
        const nm = document.createElement('div'); nm.className = 'trt';
        const b2 = document.createElement('b'); b2.textContent = f.nome; nm.appendChild(b2);
        const s2 = document.createElement('small'); s2.textContent = f.falta ? 'arquivo faltando' : fmtMB(f.tam); nm.appendChild(s2);
        r.appendChild(nm);
        r.appendChild(botao('ic sm', IC.edit, 'Renomear ' + f.nome, () => renomearFaixa(f, r)));
        r.appendChild(botao('ic sm', IC.up, 'Subir', () => acaoMusica(() => Musica.mover(f.id, -1))));
        r.appendChild(botao('ic sm', IC.down, 'Descer', () => acaoMusica(() => Musica.mover(f.id, 1))));
        r.appendChild(botao('ic sm', IC.swap, tipo === 'treino' ? 'Mover para pausa' : 'Mover para treino', () => acaoMusica(() => Musica.alterar(f.id, { lista: tipo === 'treino' ? 'pausa' : 'treino' }), 'Música movida.')));
        r.appendChild(botao('ic sm', IC.del, 'Apagar ' + f.nome, bt => confirmar(bt, 'Apagar?', () => acaoMusica(() => Musica.remover(f.id), 'Música apagada.'))));
        bx.appendChild(r);
      });
    }
    const nFalta = lista.filter(f => f.falta).length;
    $('muFalta').hidden = !nFalta;
    if (nFalta) $('muFaltaTx').textContent = nFalta + (nFalta > 1 ? ' músicas deste perfil estão' : ' música deste perfil está') + ' sem o arquivo neste aparelho (vieram de um backup). Enquanto isso, o app toca as outras ou o som dele.';
    const tot = lista.filter(f => !f.falta).reduce((a, f) => a + (f.tam || 0), 0);
    $('muUso').textContent = lista.length ? 'Ocupando ' + fmtMB(tot) + ' neste aparelho.' : '';
  }
  async function acaoMusica(fn, ok) {
    try { await fn(); await renderMusica(ok || ''); } catch (e) { await renderMusica('Atenção: ' + ((e && e.message) || 'não consegui alterar a música.')); }
  }
  function renomearFaixa(f, linha) {
    const inp = document.createElement('input'); inp.type = 'text'; inp.value = f.nome; inp.className = 'muRen'; inp.maxLength = 80;
    const nm = linha.querySelector('.trt'); nm.replaceWith(inp); inp.focus(); inp.select();
    let feito = false;
    const fim = salvar => { if (feito) return; feito = true; const v = inp.value.trim(); if (salvar && v && v !== f.nome) acaoMusica(() => Musica.alterar(f.id, { nome: v }), 'Nome alterado.'); else renderMusica(); };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') fim(true); else if (e.key === 'Escape') fim(false); });
    inp.addEventListener('blur', () => fim(true));
  }
  function abrirMusica() { if (!window.Musica) return; Musica.desbloquear(); renderMusica(''); $('muSheet').hidden = false; }
  function fecharMusica() { $('muSheet').hidden = true; if (window.Musica && !(S.estado === 'treino' || S.estado === 'descanso' || S.estado === 'preparo' || S.estado === 'concluindo')) Musica.parar(true); }
  if (window.Musica) {
    for (const o of $('muModo').children) o.addEventListener('click', () => { mcfg.modo = o.dataset.v; Musica.configurar(mcfg); const ok = gravarMusicaCfg(); renderMusica(ok ? '' : 'Atenção: não consegui gravar a escolha neste aparelho.'); });
    $('muVol').addEventListener('input', e => { mcfg.vol = Number(e.target.value) / 100; Musica.configurar(mcfg); });
    $('muVol').addEventListener('change', () => { if (!gravarMusicaCfg()) $('muMsg').textContent = 'Atenção: não consegui gravar o volume neste aparelho.'; });
    $('muAbaixar').addEventListener('change', e => { mcfg.abaixar = e.target.checked; Musica.configurar(mcfg); if (!gravarMusicaCfg()) $('muMsg').textContent = 'Atenção: não consegui gravar neste aparelho.'; });
    for (const tipo of ['treino', 'pausa']) {
      $('bMuAdd_' + tipo).addEventListener('click', () => { Musica.desbloquear(); $('muFile_' + tipo).click(); });
      $('muFile_' + tipo).addEventListener('change', async e => {
        const fs = Array.from(e.target.files || []); e.target.value = '';
        if (!fs.length) return;
        $('muMsg').textContent = 'Guardando ' + fs.length + (fs.length > 1 ? ' músicas…' : ' música…');
        let r;
        try { r = await Musica.adicionar(fs, tipo); } catch (er) { await renderMusica('Atenção: ' + ((er && er.message) || 'não consegui guardar as músicas.')); return; }
        let m = r.adicionadas ? r.adicionadas + (r.adicionadas > 1 ? ' músicas guardadas.' : ' música guardada.') : '';
        if (r.recusadas.length) m += (m ? ' ' : '') + 'Não entraram: ' + r.recusadas.join('; ') + '.';
        if (mcfg.modo !== 'minhas' && r.adicionadas) m += ' Escolha "Minhas músicas" acima para usá-las.';
        await renderMusica(m);
      });
    }
  } else $('bTrMusica').hidden = true;
  $('bMuClose').addEventListener('click', fecharMusica);
  $('bMuAchar').addEventListener('click', () => { Musica.desbloquear(); $('muAchar').click(); });

  /* =====================================================================
   * 10. MINIATURAS: o mesmo corpo 3D desenhado pequeno, um exercício por vez
   *     Um segundo desenhador (WebGL) só para as miniaturas e a prévia. A cada
   *     quadro, algumas miniaturas visíveis recebem a pose do seu exercício,
   *     são desenhadas e copiadas para o seu quadradinho; as que estão fora da
   *     tela ficam paradas.
   * ===================================================================== */
  const MINI = (function () {
    const TAM = Math.round(150 * Math.min(window.devicePixelRatio || 1, 1.6));
    let r2 = null, camM = null, falhou = false;
    const itens = []; let fila = 0, obs = null, tempo = 0, prev = null, tamAtual = 0;
    function garantir() {
      if (r2 || falhou) return !!r2;
      try {
        r2 = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        r2.setPixelRatio(1); r2.setClearColor(0x131016, 1);
        camM = new THREE.PerspectiveCamera(32, 1, 0.03, 60);
      } catch (e) { falhou = true; r2 = null; }
      return !!r2;
    }
    function tamanho(px) { if (tamAtual !== px) { r2.setSize(px, px, false); tamAtual = px; } }
    // guarda o que é do exercício principal e que a pose de outro exercício altera
    function salvarPrincipal() {
      return { cur, lado, focusKey, pivo: PIVO, garr: garrafas.map(g => [g.visible, g.position.clone()]), sombra: shadow.scale.clone(), sp: shadow.position.clone() };
    }
    function restaurarPrincipal(sv) {
      cur = sv.cur; lado = sv.lado; focusKey = sv.focusKey; PIVO = sv.pivo;
      garrafas.forEach((g, i) => { g.visible = sv.garr[i][0]; g.position.copy(sv.garr[i][1]); });
      shadow.scale.copy(sv.sombra); shadow.position.copy(sv.sp);
    }
    function desenhar(ex, tt) {
      cur = ex; focusKey = null;
      if (!ex._mini) {
        calibrate();
        ex._mini = { garr: garrafas.map(g => [g.visible, g.position.clone()]), sombra: shadow.scale.clone() };
      } else {
        garrafas.forEach((g, i) => { g.visible = ex._mini.garr[i][0]; g.position.copy(ex._mini.garr[i][1]); });
        shadow.scale.copy(ex._mini.sombra);
      }
      const per = ex.isometria ? 1 : ex.periodo;
      const ph = (1 - Math.cos(2 * Math.PI * tt / per)) / 2;
      lado = ex.alt ? Math.floor(tt / per) % 2 : 0;
      applyPose(ph); applyMuscles(ph);
      const c = ex.cam, cp = Math.cos(rad(c.ph));
      camM.position.set((c.tx || 0) + c.dist * Math.sin(rad(c.th)) * cp, c.ty + c.dist * Math.sin(rad(c.ph)), (c.tz || 0) + c.dist * Math.cos(rad(c.th)) * cp);
      camM.lookAt(c.tx || 0, c.ty, c.tz || 0);
      r2.render(scene, camM);
    }
    function registrar(canvas, ex) {
      const it = { canvas, ex, ctx: canvas.getContext('2d'), visivel: false, desenhado: false, offset: (itens.length * 0.37) % 3 };
      itens.push(it);
      if (!obs && 'IntersectionObserver' in window) obs = new IntersectionObserver(es => { for (const e of es) { const x = itens.find(i => i.canvas === e.target); if (x) x.visivel = e.isIntersecting; } }, { root: $('exList'), rootMargin: '60px' });
      if (obs) obs.observe(canvas); else it.visivel = true;
    }
    function limpar() { if (obs) obs.disconnect(); obs = null; itens.length = 0; fila = 0; }
    function abrirPrevia(ex, alvo) {
      if (!garantir()) { alvo.innerHTML = '<p class="empty" style="margin:0">Prévia indisponível neste aparelho.</p>'; return; }
      const px = Math.round(Math.min(alvo.clientWidth || 340, 480) * Math.min(window.devicePixelRatio || 1, 2));
      tamanho(px);
      alvo.innerHTML = ''; alvo.appendChild(r2.domElement);
      prev = { ex, t0: tempo };
    }
    function fecharPrevia() { prev = null; if (r2 && r2.domElement.parentNode) r2.domElement.parentNode.removeChild(r2.domElement); }
    // chamado a cada quadro; devolve true se a tela principal está coberta
    function quadro(dt) {
      tempo += dt;
      const galeria = !$('exSheet').hidden && CAT.modo === 'mini' && itens.length > 0;
      const previa = !!prev && !$('pvSheet').hidden;
      if (!galeria && !previa) return false;
      if (!garantir()) return false;
      const sv = salvarPrincipal();
      miniRender = true;
      try {
        if (previa) { desenhar(prev.ex, tempo - prev.t0); prev.n = (prev.n || 0) + 1; }
        else {
          tamanho(TAM);
          // orçamento de tempo por quadro: algumas miniaturas por vez, em rodízio
          const vis = itens.filter(i => i.visivel || !i.desenhado);
          const t0 = performance.now();
          for (let k = 0; k < vis.length; k++) {
            const it = vis[(fila + k) % vis.length];
            desenhar(it.ex, tempo + it.offset);
            it.ctx.drawImage(r2.domElement, 0, 0, it.canvas.width, it.canvas.height);
            it.desenhado = true;
            if (performance.now() - t0 > 7) { fila = (fila + k + 1) % Math.max(1, vis.length); break; }
            if (k === vis.length - 1) fila = 0;
          }
        }
      } catch (e) { /* uma miniatura com problema não derruba o app */ }
      miniRender = false;
      restaurarPrincipal(sv);
      return true;
    }
    return { TAM, registrar, limpar, quadro, abrirPrevia, fecharPrevia, ativo: () => !!r2, previaQuadros: () => prev ? prev.n || 0 : -1 };
  })();

  /* =====================================================================
   * 11. PERFIS — tela para escolher, criar, renomear e apagar
   * ===================================================================== */
  function gravarPerfis(reg) {
    try { const tx = JSON.stringify(reg); localStorage.setItem(PERFIS_KEY, tx); return localStorage.getItem(PERFIS_KEY) === tx; } catch (e) { return false; }
  }
  const perfilAtual = () => PERFIS.lista.find(p => p.id === PERFIS.atual);
  const inicial = nome => (String(nome).trim()[0] || '?').toUpperCase();
  function avatarUI() {
    const p = perfilAtual(), b = $('bPerfil');
    b.textContent = inicial(p.nome); b.style.background = p.cor;
    b.setAttribute('aria-label', 'Perfil: ' + p.nome + '. Trocar perfil'); b.title = p.nome;
  }
  /* ---------- Dados do corpo de cada perfil (opcionais) ----------
   * { v:1, sexo:'M'|'F'|'', altura:cm, idade, idadeEm:'AAAA-MM-DD',
   *   medidas: { peso: [{ d:'AAAA-MM-DD', v:kg, t:ms }] } }
   * Um registro por dia em cada medida (o último do dia vale). "medidas" já
   * comporta outras (braço, coxa, peitoral...) no futuro, cada uma com seu histórico. */
  const CORPO_BASE = 'anatomotion.corpo.v1';
  const hojeStr = (d = new Date()) => { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  function lerCorpo(pid) {
    const c = { v: 1, sexo: '', altura: null, idade: null, idadeEm: null, medidas: { peso: [] } };
    try {
      const o = JSON.parse(localStorage.getItem(CORPO_BASE + '@' + pid) || '{}') || {};
      if (o.sexo === 'M' || o.sexo === 'F') c.sexo = o.sexo;
      if (Number.isFinite(o.altura)) c.altura = o.altura;
      if (Number.isFinite(o.idade)) { c.idade = o.idade; c.idadeEm = o.idadeEm || hojeStr(); }
      if (o.medidas && typeof o.medidas === 'object') for (const k in o.medidas) if (Array.isArray(o.medidas[k])) c.medidas[k] = o.medidas[k].filter(r => r && /^\d{4}-\d{2}-\d{2}$/.test(r.d) && Number.isFinite(r.v)).sort((a, b) => a.d < b.d ? -1 : 1);
    } catch (e) { /* sem dados */ }
    return c;
  }
  function gravarCorpo(pid, c) {
    try { const tx = JSON.stringify(c); localStorage.setItem(CORPO_BASE + '@' + pid, tx); return localStorage.getItem(CORPO_BASE + '@' + pid) === tx; } catch (e) { return false; }
  }
  // registra uma medida no dia (substitui a do mesmo dia)
  function registrarMedida(c, tipo, valor, dia) {
    const l = c.medidas[tipo] || (c.medidas[tipo] = []);
    dia = dia || hojeStr();
    const i = l.findIndex(r => r.d === dia);
    const reg = { d: dia, v: valor, t: Date.now() };
    if (i >= 0) l[i] = reg; else { l.push(reg); l.sort((a, b) => a.d < b.d ? -1 : 1); }
  }
  // idade guardada com a data: com o passar dos anos, a idade mostrada acompanha
  function idadeAtual(c) {
    if (!Number.isFinite(c.idade)) return null;
    const [y, m, d] = (c.idadeEm || hojeStr()).split('-').map(Number), h = new Date();
    let anos = h.getFullYear() - y; if (h.getMonth() + 1 < m || (h.getMonth() + 1 === m && h.getDate() < d)) anos--;
    return c.idade + Math.max(0, anos);
  }
  const numBR = (v, casas) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: casas || 0, maximumFractionDigits: casas === undefined ? 1 : casas });
  const lerNum = txt => { const v = parseFloat(String(txt || '').replace(/\s/g, '').replace(',', '.')); return Number.isFinite(v) ? v : null; };
  const dataBR = d => d.split('-').reverse().join('/');
  function resumoCorpo(pid) {
    const c = lerCorpo(pid), p = [], pesos = c.medidas.peso;
    if (c.sexo) p.push(c.sexo === 'M' ? 'Masculino' : 'Feminino');
    const id = idadeAtual(c); if (id !== null) p.push(id + ' anos');
    if (c.altura) p.push(numBR(c.altura / 100, 2) + ' m');
    if (pesos.length) p.push(numBR(pesos[pesos.length - 1].v) + ' kg');
    return p.join(' · ');
  }

  /* ---------- Histórico de exercícios feitos (por perfil) ----------
   * { v:1, lista:[{ id, ex, nome, treino:{id,nome}|null, dia, inicio, fim, ativoSeg,
   *                 ciclos, reps, iso, ritmo, ritmoNome, descanso, caneleira }] } */
  const HIST_BASE = 'anatomotion.historico.v1';
  function lerHistorico(pid) {
    try { const o = JSON.parse(localStorage.getItem(HIST_BASE + '@' + pid) || '{}') || {}; return Array.isArray(o.lista) ? o.lista.filter(r => r && r.dia && r.inicio) : []; }
    catch (e) { return []; }
  }
  function gravarHistorico(pid, lista) {
    try { const tx = JSON.stringify({ v: 1, lista }); localStorage.setItem(HIST_BASE + '@' + pid, tx); return localStorage.getItem(HIST_BASE + '@' + pid) === tx; } catch (e) { return false; }
  }
  const durTxt = seg => { seg = Math.round(seg || 0); if (seg < 60) return seg + ' s'; const h = Math.floor(seg / 3600), m = Math.round((seg % 3600) / 60); return h ? h + ' h ' + String(m).padStart(2, '0') + ' min' : m + ' min'; };
  const horaTxt = ms => { const d = new Date(ms); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const regTxt = r => r.ciclos + '×' + r.reps + (r.iso ? ' s' : '') + ' · ' + (r.ritmoNome || '').toLowerCase() + (r.caneleira ? ' · ' + r.caneleira + ' kg' : '');

  /* ---------- Pergunta no fim: "Você concluiu?" ---------- */
  let concPend = null, concCb = null; // concCb: o que fazer depois da resposta (treino montado segue)
  function perguntarConclusao(regs, depois) {
    concCb = typeof depois === 'function' ? depois : null;
    concPend = regs.map(r => Object.assign({}, r, { marcado: true }));
    const um = concPend.length === 1;
    $('concTit').textContent = um ? 'Você concluiu o exercício?' : 'Quais exercícios você concluiu?';
    const box = $('concLista'); box.innerHTML = '';
    for (const r of concPend) {
      const l = document.createElement(um ? 'div' : 'label'); l.className = 'concIt';
      if (!um) { const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = true; cb.addEventListener('change', () => { r.marcado = cb.checked; }); l.appendChild(cb); }
      const tx = document.createElement('div'); tx.className = 'trt';
      const b = document.createElement('b'); b.textContent = r.nome; tx.appendChild(b);
      const sm = document.createElement('small'); sm.textContent = regTxt(r) + ' · ' + durTxt(r.ativoSeg); tx.appendChild(sm);
      l.appendChild(tx); box.appendChild(l);
    }
    $('bConcSim').textContent = um ? 'Sim, concluí' : 'Salvar no histórico';
    $('bConcNao').textContent = um ? 'Não' : 'Não registrar';
    $('concMsg').textContent = 'Fica no histórico de ' + perfilAtual().nome + '.';
    $('concBox').hidden = false;
    if (window.__autoResposta && concCb) setTimeout(() => $(window.__autoResposta === 'sim' ? 'bConcSim' : 'bConcNao').click(), 0); // só para testes automáticos
  }
  function esconderConclusao() { $('concBox').hidden = true; concPend = null; concCb = null; }
  function respondeu(registrou) { const cb = concCb; concCb = null; if (cb) cb(registrou); }
  $('bConcNao').addEventListener('click', () => { const cb = concCb; esconderConclusao(); if (cb) cb(false); });
  $('bConcSim').addEventListener('click', () => {
    if (!concPend) return;
    const novos = concPend.filter(r => r.marcado).map(r => { const o = Object.assign({}, r); delete o.marcado; return o; });
    if (!novos.length) { esconderConclusao(); return; }
    const lista = lerHistorico(PERFIS.atual).concat(novos);
    if (!gravarHistorico(PERFIS.atual, lista)) { $('concMsg').textContent = 'Atenção: não consegui gravar no histórico deste aparelho. Toque de novo para tentar.'; return; }
    $('concMsg').textContent = novos.length === 1 ? 'Registrado no histórico.' : novos.length + ' exercícios registrados.';
    concPend = null;
    if (concCb) { setTimeout(() => { if (!concPend) $('concBox').hidden = true; }, 700); respondeu(true); }
    else { falar('Registrado. Muito bem!', true); setTimeout(() => { if (!concPend) $('concBox').hidden = true; }, 1300); }
  });

  /* ---------- Gráficos simples em SVG (uma série, roxo do app) ---------- */
  const SVGNS = 'http://www.w3.org/2000/svg';
  function elSvg(tag, at) { const e = document.createElementNS(SVGNS, tag); for (const k in at) e.setAttribute(k, at[k]); return e; }
  function grafico(alvo, tipo, dados, fmtEixo) {
    // dados: [{ rot, v, dica }]
    alvo.innerHTML = '';
    if (!dados.length) return;
    const W = 340, H = 170, ml = 34, mr = 10, mt = 14, mb = 26, iw = W - ml - mr, ih = H - mt - mb;
    const vs = dados.map(d => d.v);
    let lo = tipo === 'barra' ? 0 : Math.min(...vs), hi = Math.max(...vs);
    if (tipo !== 'barra') { const pad = Math.max(0.5, (hi - lo) * 0.15); lo = Math.floor(lo - pad); hi = Math.ceil(hi + pad); }
    if (hi === lo) hi = lo + 1;
    const passo = (() => { const br = (hi - lo) / 4, p10 = Math.pow(10, Math.floor(Math.log10(br))); for (const m of [1, 2, 2.5, 5, 10]) if (m * p10 >= br) return m * p10; return br; })();
    if (tipo === 'barra') hi = Math.ceil(hi / passo) * passo; else { lo = Math.floor(lo / passo) * passo; hi = Math.ceil(hi / passo) * passo; }
    const y = v => mt + ih - (v - lo) / (hi - lo) * ih;
    const svg = elSvg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'graf', role: 'img' });
    for (let v = lo; v <= hi + 1e-9; v += passo) {
      svg.appendChild(elSvg('line', { x1: ml, x2: W - mr, y1: y(v), y2: y(v), class: 'gGrade' }));
      const t = elSvg('text', { x: ml - 6, y: y(v) + 3.5, class: 'gEixo', 'text-anchor': 'end' }); t.textContent = fmtEixo ? fmtEixo(v) : numBR(v); svg.appendChild(t);
    }
    const n = dados.length, bw = iw / n, xc = i => ml + bw * (i + 0.5);
    const cada = Math.max(1, Math.ceil(n / 7)); // no máximo ~7 rótulos de data
    dados.forEach((d, i) => { if ((n - 1 - i) % cada === 0) { const t = elSvg('text', { x: xc(i), y: H - 8, class: 'gEixo', 'text-anchor': 'middle' }); t.textContent = d.rot; svg.appendChild(t); } });
    const marcas = [];
    if (tipo === 'barra') {
      const larg = Math.max(3, Math.min(22, bw - 4));
      dados.forEach((d, i) => {
        if (d.v > 0) {
          const h = Math.max(2, y(lo) - y(d.v)), x = xc(i) - larg / 2, yy = y(d.v), r = Math.min(4, larg / 2, h);
          svg.appendChild(elSvg('path', { class: 'gBarra', d: 'M' + x + ',' + (yy + h) + 'V' + (yy + r) + 'Q' + x + ',' + yy + ' ' + (x + r) + ',' + yy + 'H' + (x + larg - r) + 'Q' + (x + larg) + ',' + yy + ' ' + (x + larg) + ',' + (yy + r) + 'V' + (yy + h) + 'Z' }));
        }
        marcas.push({ i, x: xc(i), y: y(Math.max(d.v, lo)), d });
      });
      svg.appendChild(elSvg('line', { x1: ml, x2: W - mr, y1: y(lo), y2: y(lo), class: 'gBase' }));
    } else {
      svg.appendChild(elSvg('polyline', { class: 'gLinha', points: dados.map((d, i) => xc(i) + ',' + y(d.v)).join(' ') }));
      dados.forEach((d, i) => { svg.appendChild(elSvg('circle', { class: 'gPonto', cx: xc(i), cy: y(d.v), r: 4.5 })); marcas.push({ i, x: xc(i), y: y(d.v), d }); });
    }
    // toque/hover: área de toque mais larga que a marca + dica
    const dica = document.createElement('div'); dica.className = 'gDica'; dica.hidden = true;
    const realce = elSvg('line', { class: 'gRealce', y1: mt, y2: mt + ih, x1: 0, x2: 0, visibility: 'hidden' });
    svg.insertBefore(realce, svg.firstChild);
    const mostrar = m => {
      realce.setAttribute('x1', m.x); realce.setAttribute('x2', m.x); realce.setAttribute('visibility', 'visible');
      dica.innerHTML = ''; const b = document.createElement('b'); b.textContent = m.d.dica; dica.appendChild(b);
      dica.hidden = false;
      const wR = alvo.clientWidth || W, k = wR / W;
      const dw = dica.offsetWidth || 120;
      dica.style.left = Math.min(Math.max(m.x * k, dw / 2 + 2), wR - dw / 2 - 2) + 'px'; dica.style.top = Math.max(0, m.y * k - 8) + 'px';
    };
    marcas.forEach(m => {
      const hit = elSvg('rect', { x: m.x - bw / 2, y: mt, width: bw, height: ih + mb - 6, class: 'gToque' });
      hit.addEventListener('pointerenter', () => mostrar(m)); hit.addEventListener('pointerdown', () => mostrar(m));
      svg.appendChild(hit);
    });
    svg.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { dica.hidden = true; realce.setAttribute('visibility', 'hidden'); } });
    alvo.appendChild(svg); alvo.appendChild(dica);
  }

  /* ---------- Telas do perfil: lista → ver → editar / medidas / exercícios feitos ---------- */
  let pfEdit = null; // { id|null (novo), nome, cor, corpo }
  let pfTela = { modo: 'lista', id: null, dias: 14 };
  function irPf(modo, id) { pfTela.modo = modo; if (id !== undefined) pfTela.id = id; if (modo !== 'editar') pfEdit = null; if (modo !== 'medidas') pfNova = null; renderPerfis(); $('pfSheet').querySelector('.box').scrollTop = 0; }
  function renderPerfis(msg) {
    $('pfMsg').textContent = msg || perfisErro || '';
    const m = pfTela.modo, p = PERFIS.lista.find(x => x.id === pfTela.id);
    if (m !== 'lista' && m !== 'backup' && !p && !(m === 'editar' && pfEdit && !pfEdit.id)) { pfTela.modo = 'lista'; return renderPerfis(msg); }
    $('bPfVoltar').hidden = m === 'lista';
    $('pfNota').hidden = m !== 'lista';
    $('pfTitulo').textContent = m === 'lista' ? 'Perfis' : m === 'editar' ? (pfEdit && !pfEdit.id ? 'Novo perfil' : 'Editar perfil') : m === 'medidas' ? 'Medidas · ' + p.nome : m === 'historico' ? 'Exercícios feitos · ' + p.nome : m === 'backup' ? 'Backup dos dados' : 'Perfil';
    $('bPfNovo').hidden = m !== 'lista' || PERFIS.lista.length >= 8;
    $('bPfEditar').hidden = m !== 'ver';
    $('bPfAdd').hidden = m !== 'medidas';
    $('pfBkLinha').hidden = m !== 'lista';
    const box = $('pfList'); box.innerHTML = '';
    if (m === 'lista') telaLista(box);
    else if (m === 'ver') telaVer(box, p);
    else if (m === 'editar') { const r = document.createElement('div'); r.className = 'pfr editando'; r.appendChild(formPerfil()); box.appendChild(r); }
    else if (m === 'medidas') telaMedidas(box, p);
    else if (m === 'historico') telaHistorico(box, p);
    else if (m === 'backup') telaBackup(box);
  }
  function telaLista(box) {
    for (const p of PERFIS.lista) {
      const r = document.createElement('div'); r.className = 'pfr clic' + (p.id === PERFIS.atual ? ' atual' : '');
      r.setAttribute('role', 'button'); r.tabIndex = 0; r.setAttribute('aria-label', 'Ver o perfil de ' + p.nome);
      const av = document.createElement('span'); av.className = 'avatar'; av.textContent = inicial(p.nome); av.style.background = p.cor; r.appendChild(av);
      const tx = document.createElement('div'); tx.className = 'trt';
      const b = document.createElement('b'); b.textContent = p.nome; tx.appendChild(b);
      const sm = document.createElement('small'); sm.textContent = p.id === PERFIS.atual ? 'em uso agora' : 'toque para ver o perfil'; tx.appendChild(sm);
      r.appendChild(tx);
      if (p.id !== PERFIS.atual) r.appendChild(botao('pill on', 'Entrar', 'Entrar como ' + p.nome, () => trocarPerfil(p.id)));
      const ch = document.createElement('span'); ch.className = 'pfChev'; ch.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>'; r.appendChild(ch);
      const abrir = () => irPf('ver', p.id);
      r.addEventListener('click', abrir); r.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } });
      box.appendChild(r);
    }
  }
  function telaVer(box, p) {
    const c = lerCorpo(p.id), hist = lerHistorico(p.id);
    const top = document.createElement('div'); top.className = 'pfTopo';
    const av = document.createElement('span'); av.className = 'avatar grande'; av.textContent = inicial(p.nome); av.style.background = p.cor; top.appendChild(av);
    const nm = document.createElement('div'); nm.className = 'trt';
    const b = document.createElement('b'); b.textContent = p.nome; nm.appendChild(b);
    const sm = document.createElement('small'); sm.textContent = p.id === PERFIS.atual ? 'em uso agora' : 'outro perfil'; nm.appendChild(sm);
    top.appendChild(nm); box.appendChild(top);
    // dados do corpo: só o que foi preenchido
    const itens = [];
    if (c.sexo) itens.push(['Sexo', c.sexo === 'M' ? 'Masculino' : 'Feminino']);
    const id = idadeAtual(c); if (id !== null) itens.push(['Idade', id + ' anos']);
    if (c.altura) itens.push(['Altura', numBR(c.altura / 100, 2) + ' m']);
    const ps = c.medidas.peso; if (ps.length) itens.push(['Peso', numBR(ps[ps.length - 1].v) + ' kg', ps[ps.length - 1].d === hojeStr() ? 'hoje' : 'em ' + dataBR(ps[ps.length - 1].d)]);
    if (itens.length) {
      const g = document.createElement('div'); g.className = 'pfDados';
      for (const [k, v, sub] of itens) { const d = document.createElement('div'); const s1 = document.createElement('span'); s1.textContent = k; const s2 = document.createElement('b'); s2.textContent = v; d.appendChild(s1); d.appendChild(s2); if (sub) { const s3 = document.createElement('small'); s3.textContent = sub; d.appendChild(s3); } g.appendChild(d); }
      box.appendChild(g);
    } else { const e = document.createElement('p'); e.className = 'nota'; e.textContent = 'Sem dados do corpo. Use Editar para informar sexo, idade, altura e peso (tudo opcional).'; box.appendChild(e); }
    // resumo dos treinos
    if (hist.length) {
      const dias = new Set(hist.map(r => r.dia)).size, tot = hist.reduce((a, r) => a + (r.ativoSeg || 0), 0);
      const g = document.createElement('div'); g.className = 'pfDados';
      for (const [k, v] of [['Exercícios feitos', String(hist.length)], ['Dias de treino', String(dias)], ['Tempo total', durTxt(tot)]]) { const d = document.createElement('div'); const s1 = document.createElement('span'); s1.textContent = k; const s2 = document.createElement('b'); s2.textContent = v; d.appendChild(s1); d.appendChild(s2); g.appendChild(d); }
      box.appendChild(g);
    }
    const acoes = document.createElement('div'); acoes.className = 'pfAcoes';
    if (p.id !== PERFIS.atual) acoes.appendChild(botao('pri', 'Entrar neste perfil', null, () => trocarPerfil(p.id)));
    acoes.appendChild(botao('', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19l5-6 4 3 7-9"/><path d="M4 4v15h16"/></svg><span>Ver medidas</span>', 'Ver medidas e histórico do peso', () => irPf('medidas', p.id)));
    acoes.appendChild(botao('', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 20V11M12 20V5M18 20v-6"/></svg><span>Exercícios feitos</span>', 'Ver exercícios feitos', () => irPf('historico', p.id)));
    box.appendChild(acoes);
  }
  // tipos de medida: por enquanto só o peso; outras entram nesta lista depois
  const TIPOS_MEDIDA = [{ k: 'peso', nome: 'Peso', un: 'kg', min: 20, max: 350, ex: '72,5' }];
  let pfNova = null; // { tipo, dia, valor } enquanto o formulário de nova medida está aberto
  function formNovaMedida(box, p) {
    const f = document.createElement('div'); f.className = 'pfNova'; f.id = 'pfNova';
    const tt = document.createElement('div'); tt.className = 'ttl2'; tt.style.margin = '0'; tt.innerHTML = '<span>Nova medida</span>'; f.appendChild(tt);
    const sg = document.createElement('div'); sg.className = 'seg'; sg.id = 'pfNovaTipo';
    for (const tp of TIPOS_MEDIDA) { const b = botao(pfNova.tipo === tp.k ? 'on' : '', tp.nome, null, () => { pfNova.tipo = tp.k; renderPerfis(); }); b.dataset.v = tp.k; sg.appendChild(b); }
    f.appendChild(sg);
    const tp = TIPOS_MEDIDA.find(x => x.k === pfNova.tipo);
    const lin = document.createElement('div'); lin.className = 'lin';
    const wd = document.createElement('label'); wd.className = 'pfCampo'; wd.innerHTML = '<span>Data</span>';
    const di = document.createElement('input'); di.type = 'date'; di.className = 'inp'; di.id = 'pfNovaDia'; di.max = hojeStr(); di.value = pfNova.dia; di.addEventListener('change', () => { pfNova.dia = di.value; });
    wd.appendChild(di); lin.appendChild(wd);
    lin.appendChild(campoNum(tp.nome, tp.un, pfNova.valor, 'pfNovaValor', 'ex.: ' + tp.ex));
    f.appendChild(lin);
    const n = document.createElement('p'); n.className = 'nota'; n.style.margin = '0'; n.textContent = 'Um registro por dia: se já houver ' + tp.nome.toLowerCase() + ' nessa data, ele é substituído.'; f.appendChild(n);
    const bt = document.createElement('div'); bt.className = 'btnLinha'; bt.style.margin = '0';
    bt.appendChild(botao('', 'Cancelar', null, () => { pfNova = null; renderPerfis(); }));
    bt.appendChild(botao('pri', 'Salvar medida', null, () => {
      const dia = $('pfNovaDia').value, txt = $('pfNovaValor').value.trim(), v = lerNum(txt);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || dia > hojeStr()) { $('pfMsg').textContent = 'Escolha uma data até hoje.'; return; }
      if (v === null || v < tp.min || v > tp.max) { $('pfMsg').textContent = tp.nome + ' em ' + tp.un + ', entre ' + tp.min + ' e ' + tp.max + ' (ex.: ' + tp.ex + ').'; return; }
      const c2 = lerCorpo(p.id); registrarMedida(c2, tp.k, Math.round(v * 10) / 10, dia);
      if (!gravarCorpo(p.id, c2)) { $('pfMsg').textContent = 'Atenção: não consegui gravar neste aparelho. Nada foi alterado.'; return; }
      pfNova = null; renderPerfis('Medida registrada.');
    }));
    f.appendChild(bt);
    box.appendChild(f);
    setTimeout(() => { const i = $('pfNovaValor'); if (i) i.focus(); }, 50);
  }
  function telaMedidas(box, p) {
    if (pfNova) formNovaMedida(box, p);
    const c = lerCorpo(p.id), ps = c.medidas.peso;
    const tt = document.createElement('div'); tt.className = 'ttl2'; tt.innerHTML = '<span>Peso</span>'; box.appendChild(tt);
    if (!ps.length) { const e = document.createElement('p'); e.className = 'nota'; e.textContent = 'Nenhum peso registrado ainda. Toque no + acima ou use Editar → Peso de hoje (um registro por dia; o último do dia vale).'; box.appendChild(e); return; }
    const ult = ps[ps.length - 1], pri = ps[0];
    const g = document.createElement('div'); g.className = 'pfDados';
    const dif = Math.round((ult.v - pri.v) * 10) / 10;
    for (const [k, v] of [['Atual', numBR(ult.v) + ' kg'], ['Primeiro', numBR(pri.v) + ' kg'], ['Variação', (dif > 0 ? '+' : dif < 0 ? '−' : '') + numBR(Math.abs(dif)) + ' kg']]) { const d = document.createElement('div'); const s1 = document.createElement('span'); s1.textContent = k; const s2 = document.createElement('b'); s2.textContent = v; d.appendChild(s1); d.appendChild(s2); g.appendChild(d); }
    box.appendChild(g);
    const gw = document.createElement('div'); gw.className = 'gWrap'; gw.id = 'grafPeso'; box.appendChild(gw);
    const ultimos = ps.slice(-30);
    grafico(gw, 'linha', ultimos.map(r => ({ rot: r.d.slice(8, 10) + '/' + r.d.slice(5, 7), v: r.v, dica: dataBR(r.d) + ': ' + numBR(r.v) + ' kg' })), v => numBR(v, 0));
    if (ps.length > 30) { const n = document.createElement('p'); n.className = 'nota'; n.textContent = 'O gráfico mostra os últimos 30 registros.'; box.appendChild(n); }
    const tb = document.createElement('table'); tb.className = 'tab'; tb.innerHTML = '<thead><tr><th>Data</th><th>Peso</th><th>Dif.</th><th></th></tr></thead>';
    const tbody = document.createElement('tbody'); const inv = ps.slice().reverse();
    inv.forEach((r, i) => {
      const ant = inv[i + 1], tr = document.createElement('tr');
      const td = (t, cl) => { const x = document.createElement('td'); x.textContent = t; if (cl) x.className = cl; tr.appendChild(x); };
      td(r.d === hojeStr() ? 'Hoje' : dataBR(r.d)); td(numBR(r.v) + ' kg');
      if (ant) { const x = Math.round((r.v - ant.v) * 10) / 10; td(x === 0 ? '=' : (x > 0 ? '+' : '−') + numBR(Math.abs(x)), x > 0 ? 'sobe' : x < 0 ? 'desce' : ''); } else td('');
      const tdb = document.createElement('td'); tdb.appendChild(botao('ic sm', IC.x, 'Apagar o peso de ' + dataBR(r.d), bt => confirmar(bt, 'Apagar?', () => {
        const c2 = lerCorpo(p.id); c2.medidas.peso = c2.medidas.peso.filter(x => x.d !== r.d);
        renderPerfis(gravarCorpo(p.id, c2) ? 'Registro apagado.' : 'Atenção: não consegui gravar neste aparelho.');
      }))); tr.appendChild(tdb);
      tbody.appendChild(tr);
    });
    tb.appendChild(tbody); box.appendChild(tb);
  }
  function telaHistorico(box, p) {
    const hist = lerHistorico(p.id).sort((a, b) => b.inicio - a.inicio);
    if (!hist.length) { const e = document.createElement('p'); e.className = 'nota'; e.textContent = 'Nenhum exercício registrado ainda. No fim de cada exercício, responda "Sim, concluí" para ele entrar aqui.'; box.appendChild(e); return; }
    const sg = document.createElement('div'); sg.className = 'seg'; sg.id = 'histDias';
    for (const [n, nm] of [[7, '7 dias'], [14, '14 dias'], [30, '30 dias']]) { const b = botao(pfTela.dias === n ? 'on' : '', nm, null, () => { pfTela.dias = n; renderPerfis(); }); b.dataset.v = n; sg.appendChild(b); }
    box.appendChild(sg);
    // por dia (últimos N dias, incluindo dias sem treino)
    const porDia = {}; for (const r of hist) { const d = porDia[r.dia] || (porDia[r.dia] = { n: 0, seg: 0, itens: [] }); d.n++; d.seg += r.ativoSeg || 0; d.itens.push(r); }
    const serie = []; const hj = new Date();
    for (let i = pfTela.dias - 1; i >= 0; i--) { const d = new Date(hj.getFullYear(), hj.getMonth(), hj.getDate() - i), k = hojeStr(d), x = porDia[k]; serie.push({ rot: k.slice(8, 10) + '/' + k.slice(5, 7), v: x ? x.n : 0, dica: dataBR(k) + ': ' + (x ? x.n + (x.n === 1 ? ' exercício' : ' exercícios') + ' · ' + durTxt(x.seg) : 'sem treino') }); }
    const noPer = serie.reduce((a, d) => a + d.v, 0), segPer = Object.keys(porDia).filter(k => serie.some(s => s.dica.startsWith(dataBR(k)))).reduce((a, k) => a + porDia[k].seg, 0);
    const g = document.createElement('div'); g.className = 'pfDados';
    for (const [k, v] of [['Exercícios', String(noPer)], ['Dias de treino', String(serie.filter(d => d.v).length)], ['Tempo', durTxt(segPer)]]) { const d = document.createElement('div'); const s1 = document.createElement('span'); s1.textContent = k; const s2 = document.createElement('b'); s2.textContent = v; d.appendChild(s1); d.appendChild(s2); g.appendChild(d); }
    box.appendChild(g);
    const gw = document.createElement('div'); gw.className = 'gWrap'; gw.id = 'grafHist'; box.appendChild(gw);
    grafico(gw, 'barra', serie, v => String(Math.round(v)));
    // tabela por dia
    for (const k of Object.keys(porDia).sort().reverse()) {
      const d = porDia[k], h = document.createElement('div'); h.className = 'histDia';
      const dt = new Date(k + 'T12:00:00'), sem = dt.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      h.textContent = (k === hojeStr() ? 'Hoje' : sem + ', ' + dataBR(k)) + ' · ' + d.n + (d.n === 1 ? ' exercício' : ' exercícios') + ' · ' + durTxt(d.seg);
      box.appendChild(h);
      const tb = document.createElement('table'); tb.className = 'tab'; const tbody = document.createElement('tbody');
      for (const r of d.itens) {
        const tr = document.createElement('tr');
        const t1 = document.createElement('td'); t1.textContent = horaTxt(r.inicio) + '–' + horaTxt(r.fim); t1.className = 'hora'; tr.appendChild(t1);
        const t2 = document.createElement('td'); const b = document.createElement('b'); b.textContent = r.nome; t2.appendChild(b); const sm = document.createElement('small'); sm.textContent = regTxt(r) + (r.treino ? ' · ' + r.treino.nome : ''); t2.appendChild(sm); tr.appendChild(t2);
        const t3 = document.createElement('td'); t3.textContent = durTxt(r.ativoSeg); t3.className = 'num'; tr.appendChild(t3);
        const t4 = document.createElement('td'); t4.appendChild(botao('ic sm', IC.x, 'Apagar ' + r.nome + ' do histórico', bt => confirmar(bt, 'Apagar?', () => {
          const l = lerHistorico(p.id).filter(x => x.id !== r.id);
          renderPerfis(gravarHistorico(p.id, l) ? 'Registro apagado.' : 'Atenção: não consegui gravar neste aparelho.');
        }))); tr.appendChild(t4);
        tbody.appendChild(tr);
      }
      tb.appendChild(tbody); box.appendChild(tb);
    }
  }
  function campoNum(rot, sufixo, valor, id, dica) {
    const w = document.createElement('label'); w.className = 'pfCampo';
    const t = document.createElement('span'); t.textContent = rot; w.appendChild(t);
    const lin = document.createElement('div'); lin.className = 'pfNum';
    const inp = document.createElement('input'); inp.className = 'inp'; inp.type = 'text'; inp.inputMode = 'decimal'; inp.id = id; inp.autocomplete = 'off';
    inp.value = valor === null || valor === undefined ? '' : String(valor).replace('.', ','); if (dica) inp.placeholder = dica;
    lin.appendChild(inp);
    const u = document.createElement('em'); u.textContent = sufixo; lin.appendChild(u);
    w.appendChild(lin); return w;
  }
  function formPerfil() {
    const c = pfEdit.corpo || (pfEdit.corpo = lerCorpo('__novo__'));
    const f = document.createElement('div'); f.className = 'pfForm';
    const inp = document.createElement('input'); inp.className = 'inp'; inp.maxLength = 24; inp.placeholder = 'Nome da pessoa'; inp.value = pfEdit.nome; inp.id = 'pfNome';
    inp.addEventListener('input', () => { pfEdit.nome = inp.value; });
    f.appendChild(inp);
    const cs = document.createElement('div'); cs.className = 'pfCores';
    for (const cor of CORES_PERFIL) {
      const b = botao('pfCor' + (pfEdit.cor === cor ? ' on' : ''), '', 'Cor ' + cor, () => { pfEdit.cor = cor; for (const x of cs.children) x.classList.toggle('on', x === b); });
      b.style.background = cor; cs.appendChild(b);
    }
    f.appendChild(cs);
    const tt = document.createElement('div'); tt.className = 'ttl2'; tt.innerHTML = '<span>Dados do corpo</span><em>opcional</em>'; f.appendChild(tt);
    const sx = document.createElement('div'); sx.className = 'seg'; sx.id = 'pfSexo';
    for (const [v, nm] of [['M', 'Masculino'], ['F', 'Feminino'], ['', 'Não informar']]) {
      const b = botao(c.sexo === v ? 'on' : '', nm, null, () => { c.sexo = v; for (const x of sx.children) x.classList.toggle('on', x === b); });
      b.dataset.v = v; sx.appendChild(b);
    }
    f.appendChild(sx);
    const g = document.createElement('div'); g.className = 'pfGrade';
    g.appendChild(campoNum('Idade', 'anos', idadeAtual(c), 'pfIdade'));
    g.appendChild(campoNum('Altura', 'cm', c.altura, 'pfAltura', 'ex.: 175'));
    const pesos = c.medidas.peso, hoje = pesos.find(r => r.d === hojeStr());
    g.appendChild(campoNum('Peso de hoje', 'kg', hoje ? hoje.v : null, 'pfPeso', pesos.length ? 'último: ' + numBR(pesos[pesos.length - 1].v) : 'ex.: 72,5'));
    f.appendChild(g);
    const n = document.createElement('p'); n.className = 'nota'; n.style.margin = '0'; n.textContent = 'O peso vale para o dia: registrar de novo hoje substitui o de hoje. O histórico fica em Ver medidas.'; f.appendChild(n);
    const bt = document.createElement('div'); bt.className = 'btnLinha';
    bt.appendChild(botao('', 'Cancelar', null, () => { const id = pfEdit.id; pfEdit = null; irPf(id ? 'ver' : 'lista', id); }));
    bt.appendChild(botao('pri', pfEdit.id ? 'Salvar' : 'Criar e entrar', null, salvarPerfil));
    f.appendChild(bt);
    // excluir fica aqui dentro do editar, longe dos botões do dia a dia
    if (pfEdit.id) {
      const so = PERFIS.lista.length === 1, idEx = pfEdit.id;
      f.appendChild(botao('pfApagar', IC.del + '<span>Excluir perfil</span>', 'Excluir o perfil ' + pfEdit.nome, b => confirmar(b, so ? 'Tocar de novo apaga tudo e começa do zero' : 'Tocar de novo exclui o perfil e os dados dele', () => apagarPerfil(idEx))));
    }
    if (!pfEdit.id) setTimeout(() => inp.focus(), 50);
    return f;
  }
  function salvarPerfil() {
    const nome = String(pfEdit.nome || '').trim().slice(0, 24);
    if (!nome) { $('pfMsg').textContent = 'Digite um nome.'; return; }
    if (PERFIS.lista.some(p => p.id !== pfEdit.id && p.nome.toLowerCase() === nome.toLowerCase())) { $('pfMsg').textContent = 'Já existe um perfil com esse nome.'; return; }
    // dados do corpo: vazio = não informado; preenchido precisa fazer sentido
    const c = pfEdit.corpo, tIdade = $('pfIdade').value.trim(), tAlt = $('pfAltura').value.trim(), tPeso = $('pfPeso').value.trim();
    const idade = lerNum(tIdade), alt = lerNum(tAlt), peso = lerNum(tPeso);
    if (tIdade && (idade === null || idade < 5 || idade > 110)) { $('pfMsg').textContent = 'Idade: use um número entre 5 e 110.'; return; }
    let altCm = alt; if (altCm !== null && altCm < 3) altCm = altCm * 100; // aceita "1,75"
    if (tAlt && (altCm === null || altCm < 80 || altCm > 250)) { $('pfMsg').textContent = 'Altura em centímetros, entre 80 e 250 (ex.: 175).'; return; }
    if (tPeso && (peso === null || peso < 20 || peso > 350)) { $('pfMsg').textContent = 'Peso em kg, entre 20 e 350 (ex.: 72,5).'; return; }
    const atualIdade = idadeAtual(c);
    if (!tIdade) { c.idade = null; c.idadeEm = null; }
    else if (Math.round(idade) !== atualIdade) { c.idade = Math.round(idade); c.idadeEm = hojeStr(); }
    c.altura = tAlt ? Math.round(altCm) : null;
    const hj = c.medidas.peso.find(r => r.d === hojeStr());
    if (tPeso) { const v = Math.round(peso * 10) / 10; if (!hj || hj.v !== v) registrarMedida(c, 'peso', v); }
    else if (hj) c.medidas.peso = c.medidas.peso.filter(r => r.d !== hojeStr()); // apagou o peso de hoje

    const reg = JSON.parse(JSON.stringify(PERFIS));
    let novoId = null;
    if (pfEdit.id) { const p = reg.lista.find(x => x.id === pfEdit.id); p.nome = nome; p.cor = pfEdit.cor; }
    else { novoId = 'p' + Date.now().toString(36); reg.lista.push({ id: novoId, nome, cor: pfEdit.cor, criado: Date.now() }); }
    if (novoId) reg.atual = novoId;
    const pid = pfEdit.id || novoId;
    if (!gravarCorpo(pid, c)) { $('pfMsg').textContent = 'Atenção: não consegui gravar os dados do corpo neste aparelho. Nada foi alterado.'; return; }
    if (!gravarPerfis(reg)) { $('pfMsg').textContent = 'Atenção: não consegui gravar neste aparelho. Nada foi alterado.'; return; }
    Object.assign(PERFIS, reg); pfEdit = null;
    if (novoId) { recarregarPerfil(); return; }
    avatarUI(); pfTela.modo = 'ver'; renderPerfis('Perfil salvo.');
  }
  function trocarPerfil(id) {
    const reg = JSON.parse(JSON.stringify(PERFIS)); reg.atual = id;
    if (!gravarPerfis(reg)) { renderPerfis('Atenção: não consegui trocar de perfil neste aparelho.'); return; }
    recarregarPerfil();
  }
  function recarregarPerfil() {
    // cada perfil carrega os próprios dados do zero: o jeito mais seguro é reabrir o app
    try { calarVoz(); if (window.Musica) Musica.parar(true); } catch (e) { /* ok */ }
    $('pfSheet').hidden = true;
    location.reload();
  }
  async function apagarPerfil(id) {
    const reg = JSON.parse(JSON.stringify(PERFIS)); reg.lista = reg.lista.filter(p => p.id !== id);
    const eraAtual = id === PERFIS.atual;
    if (!reg.lista.length) reg.lista.push({ id: 'p' + Date.now().toString(36), nome: 'Perfil 1', cor: CORES_PERFIL[0], criado: Date.now() }); // era o único: começa do zero
    if (eraAtual) reg.atual = reg.lista[0].id;
    if (!gravarPerfis(reg)) { renderPerfis('Atenção: não consegui apagar neste aparelho.'); return; }
    Object.assign(PERFIS, reg); pfEdit = null;
    try { for (const b of BASES_PERFIL) localStorage.removeItem(b + '@' + id); } catch (e) { /* ok */ }
    let aviso = 'Perfil apagado.';
    if (window.Musica) { try { await Musica.apagarPerfil(id); } catch (e) { aviso = 'Perfil apagado, mas algumas músicas dele não foram removidas do aparelho.'; } }
    if (eraAtual) { recarregarPerfil(); return; }
    pfTela.modo = 'lista'; renderPerfis(aviso);
  }
  $('bPerfil').addEventListener('click', () => { pfEdit = null; pfTela.modo = 'lista'; renderPerfis(); $('pfSheet').hidden = false; });
  $('bPfEditar').addEventListener('click', () => { const p = PERFIS.lista.find(x => x.id === pfTela.id); if (!p) return; pfEdit = { id: p.id, nome: p.nome, cor: p.cor, corpo: lerCorpo(p.id) }; irPf('editar', p.id); });
  $('bPfAdd').addEventListener('click', () => { pfNova = pfNova ? null : { tipo: 'peso', dia: hojeStr(), valor: null }; renderPerfis(); $('pfSheet').querySelector('.box').scrollTop = 0; });
  $('bPfVoltar').addEventListener('click', () => { const m = pfTela.modo; if (m === 'editar' && pfEdit && !pfEdit.id) { pfEdit = null; irPf('lista'); } else irPf(m === 'ver' || m === 'backup' ? 'lista' : 'ver'); });
  $('bPfClose').addEventListener('click', () => { pfEdit = null; $('pfSheet').hidden = true; });
  $('pfSheet').addEventListener('click', e => { if (e.target.id === 'pfSheet') { pfEdit = null; $('pfSheet').hidden = true; } });
  $('bPfNovo').addEventListener('click', () => { pfEdit = { id: null, nome: '', cor: CORES_PERFIL[PERFIS.lista.length % CORES_PERFIL.length], corpo: lerCorpo('__novo__') }; irPf('editar', null); });
  avatarUI();

  /* =====================================================================
   * 13. CÂMERA: fixa ou girando em volta do corpo durante o treino
   *     O ângulo atual é o centro. Até 330°: vai até a ponta de um lado,
   *     volta e vai até a outra (metade para cada lado). 360°: volta completa.
   * ===================================================================== */
  const CAMERA_KEY = chave('anatomotion.camera.v1');
  const VEL_GIRO = n => 2.5 * n; // graus por segundo: 1 = 2,5°/s … 10 = 25°/s (uma volta em ~14 s)
  const CAMCFG = (function () {
    const c = { modo: 'fixa', giro: 180, vel: 3, mov: 'natural' };
    try { const o = JSON.parse(localStorage.getItem(CAMERA_KEY) || '{}') || {}; if (o.modo === 'girar' || o.modo === 'fixa') c.modo = o.modo; if (o.mov === 'estatico') c.mov = 'estatico'; if ([30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360].includes(o.giro)) c.giro = o.giro; if (Number.isInteger(o.vel) && o.vel >= 1 && o.vel <= 10) c.vel = o.vel; } catch (e) { /* padrão */ }
    return c;
  })();
  function gravarCamCfg() { try { const tx = JSON.stringify(CAMCFG); localStorage.setItem(CAMERA_KEY, tx); return localStorage.getItem(CAMERA_KEY) === tx; } catch (e) { return false; } }
  let giroFase = 0, giroGrau = 0;
  function girarCamera(dt) {
    // só durante o exercício (anúncio, execução e aviso de fim); no descanso e fora do treino fica parada
    const ativo = CAMCFG.modo === 'girar' && !cur.repouso && !ptrs.size && !focusKey && !tweening && ['treino', 'preparo', 'concluindo'].includes(S.estado);
    if (!ativo) {
      // volta suavemente para o centro (e zera, para recomeçar dali)
      giroGrau *= Math.pow(0.02, dt); if (Math.abs(giroGrau) < 0.05) { giroGrau = 0; giroFase = 0; }
      giroOffset = rad(giroGrau); return;
    }
    const v = VEL_GIRO(CAMCFG.vel);
    if (CAMCFG.giro >= 360) { giroGrau = (giroGrau + v * dt) % 360; }
    else {
      const meia = CAMCFG.giro / 2;               // metade para cada lado do centro
      giroFase += dt * v / meia;                  // vai e volta suave (mais devagar perto das pontas)
      const alvo = meia * Math.sin(giroFase);
      giroGrau += (alvo - giroGrau) * Math.min(1, dt * 6); // sem tranco ao ligar ou mudar o giro
    }
    giroOffset = rad(giroGrau);
  }
  function camUI() {
    for (const o of $('camModo').children) o.classList.toggle('on', o.dataset.v === CAMCFG.modo);
    const des = CAMCFG.modo !== 'girar';
    $('camGiro').value = String(CAMCFG.giro); $('camVel').value = String(CAMCFG.vel);
    $('camGiro').disabled = des; $('camVel').disabled = des;
    $('camOpcoes').classList.toggle('desligado', des);
    $('camGiroTxt').textContent = CAMCFG.giro >= 360 ? '360° · volta completa' : CAMCFG.giro + '° · ' + (CAMCFG.giro / 2) + '° para cada lado';
    $('camVelTxt').textContent = CAMCFG.vel + (CAMCFG.vel <= 3 ? ' · devagar' : CAMCFG.vel <= 7 ? ' · moderada' : ' · mais rápida');
  }
  function salvarCam(msg) { $('camMsg').textContent = gravarCamCfg() ? (msg || '') : 'Atenção: não consegui gravar neste aparelho; vale só até fechar o app.'; camUI(); }
  for (const o of $('camModo').children) o.addEventListener('click', () => { CAMCFG.modo = o.dataset.v; giroFase = 0; salvarCam(); });
  $('camGiro').addEventListener('input', e => { CAMCFG.giro = Math.round(Number(e.target.value) / 30) * 30 || 30; giroFase = Math.asin(Math.max(-1, Math.min(1, CAMCFG.giro < 360 ? giroGrau / (CAMCFG.giro / 2) : 0))); camUI(); });
  $('camGiro').addEventListener('change', () => salvarCam());
  $('camVel').addEventListener('input', e => { CAMCFG.vel = Math.max(1, Math.min(10, Math.round(Number(e.target.value)))); camUI(); });
  $('camVel').addEventListener('change', () => salvarCam());
  // ao tocar na tela, o ângulo que está sendo visto passa a ser o ângulo da câmera (o giro recomeça dali ao soltar)
  renderer.domElement.addEventListener('pointerdown', () => {
    if (!giroGrau) return;
    const d = rad(giroGrau); cam.th += d; camT.th += d; giroGrau = 0; giroOffset = 0; giroFase = 0;
  }, true);
  $('bTrCamera').addEventListener('click', () => { $('camMsg').textContent = ''; camUI(); $('camSheet').hidden = false; });
  $('bCamClose').addEventListener('click', () => { $('camSheet').hidden = true; });
  $('camSheet').addEventListener('click', e => { if (e.target.id === 'camSheet') $('camSheet').hidden = true; });

  /* =====================================================================
   * 12. BOTÃO VOLTAR DO CELULAR (Android) e saída do app
   *     O app guarda sempre um passo "a mais" no histórico do navegador. Cada
   *     toque no voltar fecha a tela que está por cima; na tela principal
   *     pergunta se quer sair.
   * ===================================================================== */
  const visivel = id => { const e = $(id); return !!e && !e.hidden; };
  function voltarUmaTela() {
    if (visivel('sairBox')) { $('sairBox').hidden = true; return true; }
    if (visivel('atSheet')) { if (AT && AT.etapa === 'ajustar') { AT.etapa = 'escolher'; renderAddTreino(); } else fecharAddTreino(); return true; }
    if (visivel('infoSheet')) { $('infoSheet').hidden = true; return true; }
    if (visivel('pvSheet')) { fecharPrevia(); return true; }
    if (visivel('exSheet')) { if (visivel('exGrupoMenu')) fecharGrupoMenu(); else fecharCatalogo(); return true; }
    if (visivel('camSheet')) { $('camSheet').hidden = true; return true; }
    if (visivel('muSheet')) { $('bMuClose').click(); return true; }
    if (visivel('edSheet')) { $('bEdClose').click(); return true; }
    if (visivel('pfSheet')) { if (pfTela.modo !== 'lista') $('bPfVoltar').click(); else $('bPfClose').click(); return true; }
    if (visivel('trSheet')) { $('bTrClose').click(); return true; }
    if (visivel('cfgSheet')) { $('bCfgClose').click(); return true; }
    if (visivel('sheet')) { $('sheet').hidden = true; return true; }
    if (visivel('bClose')) { $('bClose').click(); return true; }              // músculo em foco: volta ao corpo inteiro
    if (document.body.classList.contains('infoAberta')) { $('bRecolher').click(); return true; }
    if (['treino', 'preparo', 'descanso', 'concluindo'].includes(S.estado)) { $('bParar').click(); return true; } // treinando: pausa
    return false;
  }
  let saindo = false;
  function guardarPasso() { try { history.pushState({ anato: 'guarda' }, ''); } catch (e) { /* ok */ } }
  try { history.replaceState({ anato: 'raiz' }, ''); guardarPasso(); } catch (e) { /* navegador sem histórico */ }
  window.addEventListener('popstate', () => {
    if (saindo) return;
    if (voltarUmaTela()) { guardarPasso(); return; }
    // tela principal: pergunta se quer sair. Sem guardar o passo: outro "voltar" fecha o app
    $('sairBox').hidden = false;
  });
  $('bFicar').addEventListener('click', () => { $('sairBox').hidden = true; guardarPasso(); });
  $('bSair').addEventListener('click', () => {
    saindo = true; calarVoz(); if (window.Musica) Musica.parar(true);
    $('sairBox').hidden = true;
    try { window.close(); } catch (e) { /* ok */ }
    // se o sistema não deixou fechar, volta além do início (no app instalado, isso fecha)
    setTimeout(() => { try { history.back(); } catch (e) { /* ok */ } }, 120);
    setTimeout(() => { if (!document.hidden) { saindo = false; $('sairMsg').textContent = 'Toque em voltar do celular mais uma vez para fechar.'; $('sairBox').hidden = false; } }, 900);
  });

  /* =====================================================================
   * 14. BACKUP — proteção do navegador + cópia em arquivo (exportar/importar)
   *     O arquivo leva perfis, dados do corpo, pesos, exercícios feitos,
   *     treinos, favoritos, ajustes, câmera e a "ficha" de cada música
   *     (nome, tamanho, lista, ordem, perfil). Os arquivos de áudio não vão:
   *     depois de restaurar, a pessoa aponta os arquivos e cada um volta ao lugar.
   * ===================================================================== */
  const BK_ULTIMO = 'anatomotion.backup.ultimo', BK_ANTES = 'anatomotion.backup.antes', BK_AVISO = 'anatomotion.backup.aviso';
  const BK_VERSAO = '/*VER*/';
  const idValido = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(id);
  const fmtDataHora = ms => { const d = new Date(ms); if (!isFinite(d)) return '—'; return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear() + ' às ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  let bkPend = null, bkMsg = '', bkOcupado = false;
  // pede ao navegador para não apagar os dados sozinho quando o aparelho fica sem espaço
  async function protegerArmazenamento() {
    try {
      if (!navigator.storage || !navigator.storage.persist) return 'sem';
      if (await navigator.storage.persisted()) return 'sim';
      return (await navigator.storage.persist()) ? 'sim' : 'nao';
    } catch (e) { return 'sem'; }
  }
  setTimeout(() => { protegerArmazenamento(); }, 2500);
  // chaves do app que entram no backup (as de cada perfil + a lista de perfis)
  function chavesDoBackup(reg) {
    const out = [PERFIS_KEY];
    for (const p of reg.lista) for (const b of BASES_PERFIL) out.push(b + '@' + p.id);
    return out;
  }
  async function montarBackup() {
    let reg; try { reg = JSON.parse(localStorage.getItem(PERFIS_KEY) || 'null'); } catch (e) { reg = null; }
    if (!reg || !Array.isArray(reg.lista) || !reg.lista.length) reg = JSON.parse(JSON.stringify(PERFIS));
    const dados = {};
    for (const k of chavesDoBackup(reg)) { if (k === PERFIS_KEY) continue; const v = localStorage.getItem(k); if (v !== null) dados[k] = v; }
    let musicas = [], musErro = '';
    if (window.Musica) { try { musicas = await Musica.fichas(); } catch (e) { musErro = (e && e.message) || 'erro'; } }
    return { app: 'AnatoMotion', tipo: 'backup', formato: 1, versao: BK_VERSAO, criado: new Date().toISOString(), perfis: reg, dados, musicas, musErro };
  }
  // confere um backup antes de usar: nada é gravado se algo estiver estranho
  function validarBackup(o) {
    const erro = m => ({ ok: false, erro: m });
    if (!o || typeof o !== 'object' || o.app !== 'AnatoMotion' || o.tipo !== 'backup') return erro('Este arquivo não é um backup do AnatoMotion.');
    if (!(o.formato >= 1)) return erro('Backup sem formato reconhecido.');
    if (o.formato > 1) return erro('Este backup foi feito por uma versão mais nova do app. Atualize o app e tente de novo.');
    const reg = o.perfis;
    if (!reg || !Array.isArray(reg.lista) || !reg.lista.length || reg.lista.length > 8) return erro('O backup não tem uma lista de perfis válida.');
    const ids = new Set();
    for (const p of reg.lista) { if (!p || !idValido(p.id) || typeof p.nome !== 'string' || !p.nome.trim() || ids.has(p.id)) return erro('Há um perfil inválido no backup.'); ids.add(p.id); }
    if (!ids.has(reg.atual)) reg.atual = reg.lista[0].id;
    if (!o.dados || typeof o.dados !== 'object') return erro('O backup está sem os dados.');
    for (const [k, v] of Object.entries(o.dados)) {
      const i = k.lastIndexOf('@'), base = k.slice(0, i), pid = k.slice(i + 1);
      if (i < 0 || !BASES_PERFIL.includes(base) || !ids.has(pid)) return erro('O backup tem um item desconhecido (' + k.slice(0, 40) + ').');
      if (typeof v !== 'string') return erro('O backup tem um item danificado (' + k + ').');
      try { JSON.parse(v); } catch (e) { return erro('O backup tem um item danificado (' + k + ').'); }
    }
    const mus = Array.isArray(o.musicas) ? o.musicas : [];
    for (const f of mus) if (!f || typeof f.id !== 'string' || !ids.has(f.perfil) || !['treino', 'pausa'].includes(f.lista)) return erro('A lista de músicas do backup está danificada.');
    // resumo para mostrar antes de restaurar
    let exs = 0, trs = 0;
    for (const p of reg.lista) {
      try { const h = JSON.parse(o.dados[HIST_BASE + '@' + p.id] || '{}'); if (Array.isArray(h.lista)) exs += h.lista.length; } catch (e) { /* ok */ }
      try { const t = JSON.parse(o.dados['corpo3d.treinos.v1@' + p.id] || '{}'); if (Array.isArray(t.lista)) trs += t.lista.length; } catch (e) { /* ok */ }
    }
    return { ok: true, obj: o, resumo: { criado: Date.parse(o.criado), perfis: reg.lista.map(p => p.nome), exs, trs, mus: mus.length } };
  }
  function nomeArquivoBackup() { const d = new Date(), z = n => String(n).padStart(2, '0'); return 'anatomotion-backup-' + d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + '-' + z(d.getHours()) + z(d.getMinutes()) + '.json'; }
  async function gerarArquivoBackup() {
    const o = await montarBackup(); const aviso = o.musErro; delete o.musErro;
    const txt = JSON.stringify(o);
    const v = validarBackup(JSON.parse(txt)); // confere o próprio arquivo antes de entregar
    if (!v.ok) throw new Error('O backup gerado não passou na conferência: ' + v.erro);
    return { txt, nome: nomeArquivoBackup(), aviso };
  }
  function marcarBackupFeito() { try { localStorage.setItem(BK_ULTIMO, String(Date.now())); } catch (e) { /* ok */ } }
  // o arquivo fica pronto assim que a tela abre: o celular só abre o "Enviar" se ele for chamado
  // logo no toque, sem esperar nada antes
  let bkPronto = null;
  function prepararBackup() { bkPronto = null; gerarArquivoBackup().then(r => { bkPronto = r; }).catch(() => { bkPronto = null; }); }
  // o Android não aceita enviar arquivos .json: vai como texto (.txt), com o mesmo conteúdo
  const arquivoParaEnviar = r => new File([r.txt], r.nome.replace(/\.json$/, '.txt'), { type: 'text/plain' });
  async function exportarBackup(compartilhar) {
    if (bkOcupado) return; bkOcupado = true;
    try {
      protegerArmazenamento();
      if (compartilhar) {
        let r = bkPronto, pEnvio;
        if (r) pEnvio = navigator.share({ files: [arquivoParaEnviar(r)], title: 'Backup AnatoMotion' }); // chamado já no toque
        else { r = await gerarArquivoBackup(); pEnvio = navigator.share({ files: [arquivoParaEnviar(r)], title: 'Backup AnatoMotion' }); }
        try { await pEnvio; }
        catch (e) {
          if (e && e.name === 'AbortError') { bkMsg = 'Envio cancelado.'; return; }
          if (e && e.name === 'NotAllowedError') { bkMsg = 'O celular não deixou enviar daqui. Use "Salvar arquivo" e depois envie o arquivo pela pasta Downloads (ou pelo app do Google Drive).'; return; }
          throw e;
        }
        marcarBackupFeito(); bkMsg = 'Backup enviado' + (r.aviso ? ' (a lista de músicas não entrou: ' + r.aviso + ')' : '') + '. Guarde o arquivo num lugar seguro.';
      } else {
        const { txt, nome, aviso } = bkPronto || await gerarArquivoBackup();
        const extra = aviso ? ' (a lista de músicas não entrou: ' + aviso + ')' : '';
        const url = URL.createObjectURL(new Blob([txt], { type: 'application/json' }));
        const a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        marcarBackupFeito(); bkMsg = 'Arquivo "' + nome + '" salvo em Downloads' + extra + '.';
      }
    } catch (e) { bkMsg = 'Atenção: não consegui gerar o backup (' + ((e && e.message) || 'erro') + ').'; }
    finally { bkOcupado = false; if (visivelPf('backup')) renderPerfis(); }
  }
  const visivelPf = modo => !$('pfSheet').hidden && pfTela.modo === modo;
  async function lerArquivoBackup(arq) {
    bkPend = null;
    try {
      if (arq.size > 20 * 1048576) throw new Error('arquivo grande demais para ser um backup');
      const txt = await arq.text();
      let o; try { o = JSON.parse(txt); } catch (e) { throw new Error('o arquivo não está no formato de backup (JSON)'); }
      const v = validarBackup(o);
      if (!v.ok) { bkMsg = 'Atenção: ' + v.erro + ' Nada foi alterado.'; }
      else { bkPend = v; bkMsg = ''; }
    } catch (e) { bkMsg = 'Atenção: não consegui ler o arquivo (' + ((e && e.message) || 'erro') + '). Nada foi alterado.'; }
    renderPerfis();
  }
  // grava um backup no lugar dos dados atuais. Antes, guarda uma cópia do que existe (para desfazer).
  // Se qualquer gravação falhar, volta tudo como estava.
  async function aplicarBackup(o, desfazendo) {
    if (bkOcupado) return; bkOcupado = true;
    const falhar = m => { bkMsg = 'Atenção: ' + m; bkOcupado = false; renderPerfis(); };
    let antes;
    try { antes = await montarBackup(); delete antes.musErro; } catch (e) { return falhar('não consegui ler os dados atuais. Nada foi alterado.'); }
    if (!desfazendo) {
      try { const t = JSON.stringify(antes); localStorage.setItem(BK_ANTES, t); if (localStorage.getItem(BK_ANTES) !== t) throw new Error(); }
      catch (e) { try { localStorage.removeItem(BK_ANTES); } catch (e2) { /* ok */ } return falhar('não há espaço para guardar a cópia dos dados atuais antes de restaurar. Nada foi alterado.'); }
    }
    const escrever = b => {
      for (const k of chavesDoBackup(antes.perfis).concat(chavesDoBackup(b.perfis))) localStorage.removeItem(k);
      for (const [k, v] of Object.entries(b.dados)) localStorage.setItem(k, v);
      const regTx = JSON.stringify(b.perfis); localStorage.setItem(PERFIS_KEY, regTx);
      // confere item por item
      if (localStorage.getItem(PERFIS_KEY) !== regTx) throw new Error('perfis');
      for (const [k, v] of Object.entries(b.dados)) if (localStorage.getItem(k) !== v) throw new Error(k);
    };
    try { escrever(o); }
    catch (e) {
      let volta = true;
      try { for (const k of chavesDoBackup(o.perfis)) localStorage.removeItem(k); escrever(antes); } catch (e2) { volta = false; }
      return falhar(volta ? 'não consegui gravar o backup neste aparelho (talvez falte espaço). Os dados atuais foram mantidos.' : 'a gravação falhou e não consegui voltar tudo. Use "Desfazer a última restauração" ou importe o arquivo de novo.');
    }
    let falta = 0, musAviso = '';
    if (window.Musica) {
      try { const r = await Musica.restaurarFichas(o.musicas || []); falta = r.faltando; }
      catch (e) { musAviso = ' Mas a lista de músicas não foi restaurada (' + ((e && e.message) || 'erro') + ').'; }
    }
    if (desfazendo) try { localStorage.removeItem(BK_ANTES); } catch (e) { /* ok */ }
    else try { const c = Date.parse(o.criado); if (isFinite(c) && !(Number(localStorage.getItem(BK_ULTIMO)) > c)) localStorage.setItem(BK_ULTIMO, String(c)); } catch (e) { /* ok */ }
    const msg = (desfazendo ? 'Dados de antes da restauração de volta.' : 'Backup restaurado.') + musAviso +
      (falta ? ' ' + falta + (falta > 1 ? ' músicas precisam' : ' música precisa') + ' ter o arquivo reencontrado (botão abaixo).' : '');
    try { sessionStorage.setItem(BK_AVISO, msg); } catch (e) { /* ok */ }
    bkPend = null; bkOcupado = false;
    recarregarPerfil();
  }
  function lerAntes() { try { const o = JSON.parse(localStorage.getItem(BK_ANTES) || 'null'); const v = validarBackup(o); return v.ok ? v : null; } catch (e) { return null; } }
  async function reencontrarMusicas(arqs) {
    if (!window.Musica || !arqs.length) return;
    bkMsg = 'Procurando o lugar de ' + arqs.length + (arqs.length > 1 ? ' arquivos…' : ' arquivo…'); if (visivelPf('backup')) renderPerfis();
    let m;
    try {
      const r = await Musica.reencontrar(arqs);
      m = r.encaixadas ? r.encaixadas + (r.encaixadas > 1 ? ' músicas voltaram' : ' música voltou') + ' ao lugar.' : 'Nenhum arquivo combinou com as músicas que faltam.';
      if (r.naoUsados.length) m += ' Não usados: ' + r.naoUsados.slice(0, 6).join('; ') + (r.naoUsados.length > 6 ? '…' : '') + '.';
      m += r.faltando ? ' Ainda faltam ' + r.faltando + '.' : ' Todas as músicas estão completas.';
    } catch (e) { m = 'Atenção: não consegui guardar os arquivos (' + ((e && e.message) || 'erro') + ').'; }
    bkMsg = m;
    if (visivelPf('backup')) renderPerfis();
    if (!$('muSheet').hidden) renderMusica(m);
  }
  function linhaBk(titulo, sub) {
    const r = document.createElement('div'); r.className = 'bkLinha';
    const b = document.createElement('b'); b.textContent = titulo; r.appendChild(b);
    if (sub) { const sm = document.createElement('small'); sm.textContent = sub; r.appendChild(sm); }
    return r;
  }
  function botoesBk(lista) {
    const l = document.createElement('div'); l.className = 'btnLinha';
    for (const [txt, cls, fn, id] of lista) { const b = document.createElement('button'); b.textContent = txt; if (cls) b.className = cls; if (id) b.id = id; b.disabled = bkOcupado; b.addEventListener('click', () => fn(b)); l.appendChild(b); }
    return l;
  }
  function telaBackup(box) {
    const tit = t => { const d = document.createElement('div'); d.className = 'ttl2'; const s2 = document.createElement('span'); s2.textContent = t; d.appendChild(s2); box.appendChild(d); };
    if (bkMsg) { const m = document.createElement('p'); m.className = 'msg bkMsg'; m.id = 'bkMsg'; m.textContent = bkMsg; box.appendChild(m); }
    const lugarFalta = document.createElement('div'); box.appendChild(lugarFalta); // músicas sem arquivo aparecem logo no topo
    // proteção do navegador
    tit('Proteção deste aparelho');
    const prot = linhaBk('Verificando…'); prot.id = 'bkProt'; box.appendChild(prot);
    protegerArmazenamento().then(r => {
      const b = prot.querySelector('b');
      if (r === 'sim') { b.textContent = '✓ Proteção ativa'; prot.classList.add('ok'); prot.appendChild(Object.assign(document.createElement('small'), { textContent: 'O navegador não vai apagar os dados sozinho quando faltar espaço. Limpar os dados do navegador manualmente ainda apaga tudo: por isso, faça backup.' })); }
      else { b.textContent = 'Proteção não concedida pelo navegador'; prot.appendChild(Object.assign(document.createElement('small'), { textContent: r === 'sem' ? 'Este navegador não oferece essa proteção. Faça backups com frequência.' : 'Instalar o app na tela inicial e usá-lo com frequência costuma liberar a proteção. Enquanto isso, faça backups.' })); }
    });
    // exportar
    tit('Fazer backup');
    let ult = 0; try { ult = Number(localStorage.getItem(BK_ULTIMO)) || 0; } catch (e) { /* ok */ }
    box.appendChild(linhaBk(ult ? 'Último backup: ' + fmtDataHora(ult) : 'Nenhum backup feito ainda', 'Vai no arquivo: perfis, dados do corpo, pesos, exercícios feitos, treinos, favoritos, ajustes e a lista de músicas. Os arquivos de áudio não vão: depois de restaurar, basta apontá-los de novo.'));
    const podeEnviar = !!(navigator.canShare && (() => { try { return navigator.canShare({ files: [new File(['{}'], 'a.txt', { type: 'text/plain' })] }); } catch (e) { return false; } })());
    prepararBackup();
    const bts = [['Salvar arquivo', 'pri', () => exportarBackup(false), 'bBkSalvar']];
    if (podeEnviar) bts.push(['Enviar…', '', () => exportarBackup(true), 'bBkEnviar']);
    box.appendChild(botoesBk(bts));
    if (podeEnviar) { const n = document.createElement('p'); n.className = 'nota'; n.style.marginTop = '0'; n.textContent = '"Enviar…" abre as opções do celular: Google Drive, WhatsApp, e-mail… O arquivo enviado termina em .txt e pode ser importado do mesmo jeito.'; box.appendChild(n); }
    // restaurar
    tit('Restaurar');
    if (bkPend) {
      const r = bkPend.resumo, c = document.createElement('div'); c.className = 'bkConf';
      c.appendChild(linhaBk('Backup de ' + fmtDataHora(r.criado), r.perfis.length + (r.perfis.length > 1 ? ' perfis: ' : ' perfil: ') + r.perfis.join(', ') + ' · ' + r.exs + ' exercícios feitos · ' + r.trs + (r.trs === 1 ? ' treino' : ' treinos') + ' · ' + r.mus + (r.mus === 1 ? ' música' : ' músicas')));
      const av = document.createElement('p'); av.className = 'msg'; av.textContent = 'Os dados atuais deste aparelho serão trocados pelos do backup. Antes, o app guarda uma cópia deles para você poder desfazer.'; c.appendChild(av);
      c.appendChild(botoesBk([['Cancelar', '', () => { bkPend = null; bkMsg = ''; renderPerfis(); }], ['Restaurar', 'pri', () => aplicarBackup(bkPend.obj, false), 'bBkRestaurar']]));
      box.appendChild(c);
    } else {
      box.appendChild(botoesBk([['Importar backup…', '', () => $('bkArquivo').click(), 'bBkImportar']]));
    }
    const antes = lerAntes();
    if (antes && !bkPend) {
      box.appendChild(linhaBk('Cópia de antes da última restauração', 'Dados deste aparelho de ' + fmtDataHora(antes.resumo.criado) + ', caso a restauração não tenha sido o que você queria.'));
      box.appendChild(botoesBk([['Desfazer a última restauração', '', b => confirmar(b, 'Toque de novo para desfazer', () => aplicarBackup(antes.obj, true)), 'bBkDesfazer']]));
    }
    // músicas sem arquivo
    if (window.Musica) Musica.faltando().then(n => {
      if (!n || !lugarFalta.isConnected || pfTela.modo !== 'backup') return;
      const s2 = document.createElement('div'); s2.id = 'bkFalta';
      const t = document.createElement('div'); t.className = 'ttl2'; t.innerHTML = '<span>Músicas</span>'; s2.appendChild(t);
      s2.appendChild(linhaBk(n + (n > 1 ? ' músicas estão' : ' música está') + ' sem o arquivo neste aparelho', 'Toque abaixo e selecione os arquivos (pode marcar vários, ou todos da pasta de músicas). O app encaixa cada um no lugar certo, em todos os perfis.'));
      s2.appendChild(botoesBk([['Reencontrar músicas…', 'pri', () => $('muAchar').click(), 'bBkAchar']]));
      lugarFalta.appendChild(s2);
    }).catch(() => { /* ok */ });
  }
  $('bPfBackup').addEventListener('click', () => { bkPend = null; bkMsg = ''; irPf('backup'); });
  $('bkArquivo').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) lerArquivoBackup(f); });
  $('muAchar').addEventListener('change', e => { const fs = Array.from(e.target.files || []); e.target.value = ''; reencontrarMusicas(fs); });
  // depois de restaurar, o app reabre: mostra o resultado na tela de backup
  (function () {
    let m = null; try { m = sessionStorage.getItem(BK_AVISO); sessionStorage.removeItem(BK_AVISO); } catch (e) { /* ok */ }
    if (!m) return;
    bkMsg = m; pfTela.modo = 'backup'; renderPerfis(); $('pfSheet').hidden = false;
  })();

  setExercise('repouso', true);
  painelTreino();

  let last = null;
  function loop(ts) {
    if (last === null) last = ts;
    const dt = Math.min((ts - last) / 1000, 0.1); last = ts;
    passo(dt);
    girarCamera(dt);
    // com a galeria ou a prévia cobrindo a tela, o corpo principal não precisa ser redesenhado
    const coberto = MINI.quadro(dt);
    if (!coberto) {
      applyPose(phase); aplicarBlend(dt); applyMuscles(phase); placeCamera();
      renderer.render(scene, camera);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  window.__corpo = {
    exercicios: EXERCICIOS.map(e => e.id), catalogo: () => EXERCICIOS.map(e => ({ id: e.id, equip: e.equip, regiao: e.regiao, alt: !!e.alt, info: !!(e.info && e.info.passos && e.info.passos.length) })), musculos: Object.keys(INFO),
    setExercise: id => setExercise(id, true),
    atual: () => cur.id, repouso: () => repousoAtivo(),
    exAtual: () => cur,
    garrafasPos: () => garrafas.filter(g => g.visible).map(g => g.position.toArray()),
    pesPos: () => GR.pes.map(o => o.getWorldPosition(new V3()).toArray()),
    camera: c => aimCamera(c, true),
    posar: (p, l) => { S.estado = 'congelado'; phase = p; lado = l || 0; blend = null; applyPose(p); },
    neutro: () => { cur = Object.assign({}, cur, { prim: [], sec: [] }); },
    setPhase: (p, l) => { S.estado = 'congelado'; phase = p; lado = l || 0; },
    cfgAtual: () => Object.assign({}, cfg),
    treinos: () => JSON.parse(JSON.stringify(TREINOS)),
    seq: () => SEQ ? { id: SEQ.t.id, idx: SEQ.idx, troca: S.troca, espera: +S.espera.toFixed(2), tc: Object.assign({}, tc) } : null,
    executarTreino: id => executarTreino(id),
    musica: () => window.Musica ? Musica.estado() : null,
    classes: () => document.body.className,
    perfis: () => JSON.parse(JSON.stringify(PERFIS)),
    corpo: pid => lerCorpo(pid || PERFIS.atual),
    historico: pid => lerHistorico(pid || PERFIS.atual),
    backup: { montar: () => gerarArquivoBackup(), validar: o => { const v = validarBackup(o); return v.ok ? { ok: true, resumo: v.resumo } : v; }, ler: f => lerArquivoBackup(f), aplicar: o => aplicarBackup(o, false), reencontrar: fs => reencontrarMusicas(fs) },
    // diagnóstico: partes do corpo que a barra atravessa na pose atual
    barraNoCorpo: () => {
      const b2 = barra.visible ? barra : barraW.visible ? barraW : null; if (!b2) return null;
      rig.updateMatrixWorld(true); baseMesh.skeleton.update();
      const c = b2.position.clone(), eixo = new V3(1, 0, 0).applyQuaternion(b2.quaternion);
      const m1 = CONTACT.hands[0].getWorldPosition(new V3()), m2 = CONTACT.hands[2].getWorldPosition(new V3());
      const pos = baseMesh.geometry.attributes.position, si = baseMesh.geometry.attributes.skinIndex, sw = baseMesh.geometry.attributes.skinWeight, v = new V3();
      const res = {}; let pior = 9;
      for (let i = 0; i < pos.count; i += 2) {
        v.fromBufferAttribute(pos, i); baseMesh.boneTransform(i, v); v.applyMatrix4(baseMesh.matrixWorld);
        const d0 = v.clone().sub(c), al = d0.dot(eixo); if (Math.abs(al) > 0.55) continue;
        const dist = d0.addScaledVector(eixo, -al).length();
        if (v.distanceTo(m1) < 0.09 || v.distanceTo(m2) < 0.09) continue; // mãos segurando
        let k = 0; for (let j = 1; j < 4; j++) if (sw.array[i * 4 + j] > sw.array[i * 4 + k]) k = j;
        const osso = baseMesh.skeleton.bones[si.array[i * 4 + k]].name;
        if (dist < (window.__limBarra || 0.012)) res[osso] = (res[osso] || 0) + 1;
        if (dist < pior) pior = dist;
      }
      return { pior: +pior.toFixed(3), dentro: res };
    },
    treinosIds: () => TREINOS.map(t => ({ id: t.id, nome: t.nome, itens: t.itens.map(i => i.ex) })),
    camera2: () => ({ dif: ['th', 'ph', 'dist', 'tx', 'ty', 'tz'].map(k => +(camT[k] - cam[k]).toFixed(4)).join(','), tw: tweening, est: S.estado, rep: cur.repouso, foco: focusKey, ptrs: ptrs.size, cfg: Object.assign({}, CAMCFG), grau: +giroGrau.toFixed(2), th: +(cam.th * 180 / Math.PI).toFixed(2) }),
    catalogo2: () => ({ favs: CAT.favs.slice(), soFav: CAT.soFav, grupo: CAT.grupo, modo: CAT.modo, mini: !!MINI.ativo(), previaQuadros: MINI.previaQuadros() }),
    treino: () => ({ estado: S.estado, ciclo: S.ciclo, rep: S.rep, resto: +S.resto.toFixed(2), cfg: Object.assign({}, tc) }),
    avancar: seg => { const n = Math.round(seg / 0.05); for (let i = 0; i < n; i++) passo(0.05); },
    mirarEm: (k, th, ph, dist) => { const ids = BYKEY[k], c = new V3(); ids.forEach(i => c.add(centroid(i))); c.divideScalar(ids.length); tweening = false; Object.assign(cam, { th: rad(th), ph: rad(ph), dist, tx: c.x, ty: c.y, tz: c.z }); },
    tempoNatural: t => { tNatFixo = t; },
    perfilMov: id => { const e = EXERCICIOS.find(x => x.id === id); return e ? perfilEsforco(e) : null; },
    rotOssos: () => { const o = {}; for (const b of boneList) o[b.name] = [b.rotation.x, b.rotation.y, b.rotation.z].map(v => v * 180 / Math.PI); return o; },
    movimento: v => { if (v) { CAMCFG.mov = v; gravarCamCfg(); } return CAMCFG.mov; },
    focarPorcao: reg => { const id = BYKEY.reto_abdome.find(i => INST[i].reg === reg && INST[i].side === 'left'); setFocus('reto_abdome', [id]); return { t: $('mTec').textContent, r: $('mRole').textContent }; },
    porcoes: k => (BYKEY[k] || []).map(i => ({ reg: INST[i].reg, side: INST[i].side, pri: stateData[i * 4] / 255, sec: stateData[i * 4 + 2] / 255 })),
    setView: (th, ph, dist, ty) => { tweening = false; Object.assign(cam, { th: rad(th), ph: rad(ph), dist, tx: 0, ty, tz: 0 }); },
    focus: (k, s) => { focusMuscle(k, s); Object.assign(cam, camT); tweening = false; },
    clearFocus: () => { clearFocus(true); Object.assign(cam, camT); tweening = false; },
    cam: () => ({ th: +(cam.th * 180 / Math.PI).toFixed(2), ph: +(cam.ph * 180 / Math.PI).toFixed(2), dist: +cam.dist.toFixed(3), alvo: [cam.tx, cam.ty, cam.tz].map(v => +v.toFixed(3)) }),
    foco: () => ({ k: focusKey, ids: [...focusIds] }),
    fimAnimacao: () => { Object.assign(cam, camT); tweening = false; },
    pickAt: (x, y) => { const h = pickAt(x, y); return h ? h.k + ':' + h.side : null; },
    project: (x, y, z) => { const v = new V3(x, y, z).project(camera); const r = renderer.domElement.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; },
    postura: () => { rig.updateMatrixWorld(true); const g = n => bones[n].getWorldPosition(new V3()); const r = {}; for (const n of ['head', 'hips', 'leftLowerLeg', 'leftFoot', 'leftToes', 'upperChest']) r[n] = g(n).toArray().map(x => +x.toFixed(3)); return r; },
    pontos: () => { const r = {}; for (const [k, l] of [['pes', PIVO], ['maos', CONTACT.hands]]) { const v = new V3(); for (const o of l) { o.getWorldPosition(_w); v.add(_w); } v.multiplyScalar(1 / l.length); r[k] = v.toArray().map(x => +x.toFixed(4)); } r.peito = +bones.upperChest.getWorldPosition(new V3()).y.toFixed(3); return r; },
    ossos: l => Object.fromEntries(l.map(n => [n, bones[n].getWorldPosition(new V3()).toArray().map(v => +v.toFixed(3))])),
    medir: () => ({ ikErro, pesY: ['left', 'right'].map(pn => PES[pn].map(o => +o.getWorldPosition(new V3()).y.toFixed(3))), minFeet: minY(CONTACT.feet), minHands: minY(CONTACT.hands), minAll: minY(ALL_CONTACTS), ossos: boneList.length, musculos: Object.keys(INFO).length, instancias: NM, vertices: muscleMesh.geometry.attributes.position.count + baseMesh.geometry.attributes.position.count })
  };
})();
