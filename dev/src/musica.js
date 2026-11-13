/* =========================================================================
 * AnatoMotion — trilha sonora
 *  - som do app: músicas sintetizadas na hora (Web Audio), sem arquivos e
 *    sem direitos autorais; estilos diferentes para treino e para pausa
 *  - minhas músicas: arquivos de áudio escolhidos pela pessoa (até 12 de
 *    treino e 12 de pausa), guardados no IndexedDB do próprio app
 *  - a música abaixa sozinha enquanto a voz fala
 * ========================================================================= */
window.Musica = (function () {
  'use strict';
  const MAX_POR_LISTA = 12, MAX_MB = 40;
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null, duckG = null, synthBus = null, faixaG = null, ruido = null;
  let conf = { modo: 'app', vol: 0.7, abaixar: true };
  const st = { tipo: null, tocando: false, pausado: false, fonte: null, nome: '', estilo: -1, faixaId: null, rotTreino: 0, rotPausa: 0, erro: '' };

  /* ---------------- contexto de áudio ---------------- */
  function garantirCtx() {
    if (ctx || !AC) return ctx;
    try {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = conf.vol; master.connect(ctx.destination);
      duckG = ctx.createGain(); duckG.gain.value = 1; duckG.connect(master);
      synthBus = ctx.createGain(); synthBus.gain.value = 0; synthBus.connect(duckG);
      faixaG = ctx.createGain(); faixaG.gain.value = 0; faixaG.connect(duckG);
      const n = ctx.sampleRate; ruido = ctx.createBuffer(1, n, n);
      const d = ruido.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
    return ctx;
  }
  // precisa ser chamado dentro de um toque (regra dos navegadores para som)
  function desbloquear() {
    garantirCtx();
    if (ctx && ctx.state === 'suspended') try { ctx.resume(); } catch (e) { /* ok */ }
    // libera o player de arquivos dentro do toque (exigência do iPhone), tocando um silêncio curtinho
    if (!elDesbloqueado && st.fonte !== 'minhas') {
      garantirEl(); elDesbloqueado = true;
      try { el.src = SILENCIO; const p = el.play(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ok */ }
    }
  }
  function rampa(g, v, s) {
    if (!ctx) return; const now = ctx.currentTime;
    try { g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(v, now + s); } catch (e) { g.gain.value = v; }
  }

  /* ---------------- instrumentos sintetizados ---------------- */
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  function env(g, t, a, peak, dec, sus, rel, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * sus), t + a + dec);
    g.gain.setValueAtTime(Math.max(0.0001, peak * sus), t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
  }
  function osc(tipo, f, t, dur, peak, a, dec, sus, rel, filtro, destino) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo; o.frequency.setValueAtTime(f, t);
    let n = o;
    if (filtro) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(filtro, t); fl.Q.value = 2; o.connect(fl); n = fl; }
    n.connect(g); g.connect(destino || synthBus);
    env(g, t, a, peak, dec, sus, rel, dur);
    o.start(t); o.stop(t + dur + rel + 0.05);
    return o;
  }
  function kick(t, v) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(v || 0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g); g.connect(synthBus); o.start(t); o.stop(t + 0.4);
  }
  function chiado(t, dur, v, freq, tipo) {
    const s = ctx.createBufferSource(); s.buffer = ruido;
    const f = ctx.createBiquadFilter(); f.type = tipo || 'highpass'; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(synthBus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  const hat = (t, aberto) => chiado(t, aberto ? 0.18 : 0.045, aberto ? 0.16 : 0.12, 7000);
  const caixa = t => { chiado(t, 0.16, 0.35, 1800, 'bandpass'); osc('triangle', 190, t, 0.05, 0.25, 0.002, 0.05, 0.3, 0.05); };
  const palma = t => { for (let k = 0; k < 3; k++) chiado(t + k * 0.011, 0.12, 0.28, 1300, 'bandpass'); };
  const baixo = (t, m, d, tipo) => osc(tipo || 'sawtooth', hz(m), t, d, 0.32, 0.005, 0.12, 0.5, 0.05, 520);
  const pluck = (t, m, d, v) => osc('square', hz(m), t, d, v || 0.07, 0.003, 0.15, 0.2, 0.08, 2600);
  const pad = (t, ms, d, v) => { for (const m of ms) { osc('sawtooth', hz(m) * 1.003, t, d, (v || 0.035), 0.4, 0.3, 0.8, 0.8, 1300); osc('triangle', hz(m), t, d, (v || 0.035) * 1.4, 0.5, 0.3, 0.8, 1, 1800); } };
  const sino = (t, m, v) => { osc('sine', hz(m), t, 0.05, v || 0.09, 0.005, 1.6, 0.001, 0.4); osc('sine', hz(m) * 2.76, t, 0.05, (v || 0.09) * 0.25, 0.003, 0.6, 0.001, 0.2); };

  // acordes (notas MIDI) e estilos
  const PROG = [
    [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],   // Am F C G
    [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 48, 52]],   // Dm Bb C Am
    [[52, 55, 59], [48, 52, 55], [50, 54, 57], [47, 50, 54]],   // Em C D Bm
    [[53, 57, 60], [55, 59, 62], [57, 60, 64], [52, 55, 59]]    // F G Am Em
  ];
  const ESTILOS = {
    treino: [
      { nome: 'Pulso', bpm: 124, prog: 0, passo(i, t, c) { const s = i % 16;
          if (s % 4 === 0) kick(t); if (s % 4 === 2) hat(t, true); else if (s % 2 === 1) hat(t);
          if (s % 4 === 2) baixo(t, c[0] - 12, 0.18);
          if (s === 4 || s === 12) palma(t);
          if (s === 0) pad(t, c, 1.6, 0.025); } },
      { nome: 'Corrida', bpm: 132, prog: 1, passo(i, t, c) { const s = i % 16;
          if (s === 0 || s === 8 || s === 10) kick(t); if (s === 4 || s === 12) caixa(t); hat(t, s === 14);
          if (s % 2 === 0) baixo(t, c[0] - 12 + (s % 8 === 6 ? 12 : 0), 0.12, 'square');
          if (s % 2 === 0) pluck(t, c[(s / 2) % 3] + 12, 0.1); } },
      { nome: 'Foco', bpm: 116, prog: 2, passo(i, t, c) { const s = i % 16;
          if (s === 0 || s === 6 || s === 10) kick(t); if (s === 4 || s === 12) palma(t); if (s % 2 === 0) hat(t, s === 6);
          if (s === 0 || s === 3 || s === 8 || s === 11) baixo(t, c[0] - 12, 0.2);
          if (s === 2 || s === 10) pluck(t, c[2] + 12, 0.25, 0.06); if (s === 0) pad(t, c, 1.8, 0.022); } },
      { nome: 'Energia', bpm: 128, prog: 3, passo(i, t, c) { const s = i % 16;
          if (s % 4 === 0) kick(t); if (s === 4 || s === 12) { palma(t); caixa(t); } hat(t, s % 4 === 2);
          baixo(t, c[0] - 12 + (s % 4 === 3 ? 7 : 0), 0.1);
          if (s % 3 === 0) pluck(t, c[s % 3] + 24, 0.09, 0.05); if (s === 0) pad(t, c, 1.7, 0.02); } }
    ],
    pausa: [
      { nome: 'Respiro', bpm: 70, prog: 0, passo(i, t, c) { const s = i % 16;
          if (s === 0) pad(t, c.map(m => m), 3.2, 0.03); if (s === 6 || s === 12) sino(t, c[(i >> 4) % 3] + 24, 0.06); } },
      { nome: 'Calma', bpm: 64, prog: 3, passo(i, t, c) { const s = i % 16;
          if (s === 0) pad(t, [c[0] - 12, c[1], c[2] + 12], 3.4, 0.028); if (s % 4 === 2) sino(t, c[(s >> 2) % 3] + 24, 0.045); } },
      { nome: 'Brisa', bpm: 76, prog: 2, passo(i, t, c) { const s = i % 16;
          if (s === 0) pad(t, c, 3, 0.03); if (s === 0 || s === 10) osc('sine', hz(c[0] - 12), t, 1.2, 0.12, 0.2, 0.5, 0.6, 0.6);
          if (s === 8) sino(t, c[2] + 24, 0.05); } }
    ]
  };

  let seqTimer = null, seqPasso = 0, seqProx = 0, estiloAtual = null, ritmoMul = 1;
  function agendar() {
    if (!ctx || !estiloAtual) return;
    const durPasso = 60 / (estiloAtual.bpm * ritmoMul) / 4;
    while (seqProx < ctx.currentTime + 0.15) {
      const prog = PROG[estiloAtual.prog], c = prog[Math.floor(seqPasso / 16) % prog.length];
      try { estiloAtual.passo(seqPasso, seqProx, c); } catch (e) { /* nota perdida não para a música */ }
      seqPasso++; seqProx += durPasso;
    }
  }
  function iniciarSynth(tipo, idx) {
    pararSynth(true);
    const lista = ESTILOS[tipo]; estiloAtual = lista[idx % lista.length];
    st.estilo = idx % lista.length; st.nome = estiloAtual.nome; st.fonte = 'app';
    seqPasso = 0; seqProx = ctx.currentTime + 0.08;
    agendar(); seqTimer = setInterval(agendar, 25);
    rampa(synthBus, tipo === 'pausa' ? 0.9 : 0.75, 0.6);
  }
  function pararSynth(imediato) {
    if (seqTimer) { clearInterval(seqTimer); seqTimer = null; }
    estiloAtual = null;
    if (synthBus) rampa(synthBus, 0, imediato ? 0.05 : 0.5);
  }

  /* ---------------- banco de músicas (IndexedDB) ---------------- */
  let dbP = null;
  function db() {
    if (dbP) return dbP;
    dbP = new Promise((res, rej) => {
      if (!window.indexedDB) { rej(new Error('Este navegador não permite guardar músicas.')); return; }
      const r = indexedDB.open('corpo3d', 1);
      r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('faixas')) d.createObjectStore('faixas', { keyPath: 'id' }); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error || new Error('Não consegui abrir o armazenamento de músicas.'));
      r.onblocked = () => rej(new Error('Armazenamento de músicas bloqueado. Feche outras abas do app.'));
    });
    dbP.catch(() => { dbP = null; });
    return dbP;
  }
  function tx(modo, fn) {
    return db().then(d => new Promise((res, rej) => {
      const t = d.transaction('faixas', modo), s = t.objectStore('faixas'); let out;
      try { out = fn(s); } catch (e) { rej(e); return; }
      t.oncomplete = () => res(out && typeof IDBRequest !== 'undefined' && out instanceof IDBRequest ? out.result : out);
      t.onerror = () => rej(t.error || new Error('Falha ao gravar'));
      t.onabort = () => rej(t.error || new Error('Gravação cancelada (talvez falte espaço no aparelho).'));
    }));
  }
  let cache = null; // metadados (sem os arquivos) das músicas do perfil atual
  let perfil = 'p1';
  const perfilDe = v => v.perfil || 'p1'; // músicas antigas, de antes dos perfis, são do Perfil 1
  const SOBRA = '#sobra'; // arquivos guardados que ficaram sem lugar depois de uma importação (servem para desfazer)
  const ficha = v => ({ id: v.id, nome: v.nome, lista: v.lista, perfil: perfilDe(v), ordem: v.ordem, tam: v.tam, tipo: v.tipo, arq: v.arq || '', mod: v.mod || 0 });
  function listar() {
    return db().then(d => new Promise((res, rej) => {
      const out = [], r = d.transaction('faixas').objectStore('faixas').openCursor();
      r.onsuccess = () => { const c = r.result; if (c) { const v = c.value; if (perfilDe(v) === perfil) out.push(Object.assign(ficha(v), { falta: !v.blob })); c.continue(); } else { out.sort((a, b) => a.ordem - b.ordem); cache = out; res(out.slice()); } };
      r.onerror = () => rej(r.error);
    }));
  }
  // todos os registros, com os arquivos (só para backup/restauração)
  function todos() {
    return db().then(d => new Promise((res, rej) => {
      const out = [], r = d.transaction('faixas').objectStore('faixas').openCursor();
      r.onsuccess = () => { const c = r.result; if (c) { out.push(c.value); c.continue(); } else res(out); };
      r.onerror = () => rej(r.error);
    }));
  }
  const daLista = (l, nome) => (l || cache || []).filter(f => f.lista === nome);
  const tocaveis = nome => daLista(null, nome).filter(f => !f.falta); // as que têm o arquivo neste aparelho
  function pedirPersistencia() { try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ok */ } }
  function nomeLimpo(n) { return String(n || 'Música').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').trim().slice(0, 80) || 'Música'; }
  async function adicionar(arquivos, lista) {
    const res = { adicionadas: 0, recusadas: [] };
    const atuais = await listar();
    let vagas = MAX_POR_LISTA - daLista(atuais, lista).length;
    let ordem = atuais.reduce((m, f) => Math.max(m, f.ordem || 0), 0);
    for (const f of Array.from(arquivos || [])) {
      const nome = nomeLimpo(f.name);
      if (vagas <= 0) { res.recusadas.push(nome + ': a lista já tem ' + MAX_POR_LISTA + ' músicas'); continue; }
      if (f.type && !/^audio\//.test(f.type) && !/\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|webm)$/i.test(f.name)) { res.recusadas.push(nome + ': não é um arquivo de áudio'); continue; }
      if (f.size > MAX_MB * 1048576) { res.recusadas.push(nome + ': maior que ' + MAX_MB + ' MB'); continue; }
      const id = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      const reg = { id, nome, lista, perfil, ordem: ++ordem, tam: f.size, tipo: f.type || 'audio/mpeg', arq: String(f.name || ''), mod: f.lastModified || 0, blob: f };
      try {
        await tx('readwrite', s => s.put(reg));
        // confere se ficou gravado de verdade
        const volta = await tx('readonly', s => s.get(id));
        if (!volta || !volta.blob || volta.blob.size !== f.size) throw new Error('verificação falhou');
        res.adicionadas++; vagas--;
      } catch (e) {
        res.recusadas.push(nome + ': não consegui gravar (' + (e && e.name === 'QuotaExceededError' ? 'falta espaço' : (e && e.message) || 'erro') + ')');
      }
    }
    if (res.adicionadas) pedirPersistencia();
    await listar();
    return res;
  }
  async function alterar(id, mud) {
    const v = await tx('readonly', s => s.get(id)); if (!v) throw new Error('Música não encontrada');
    if (mud.lista && mud.lista !== v.lista && daLista(null, mud.lista).length >= MAX_POR_LISTA) throw new Error('A outra lista já tem ' + MAX_POR_LISTA + ' músicas');
    Object.assign(v, mud); if (mud.nome !== undefined) v.nome = String(mud.nome).trim().slice(0, 80) || v.nome;
    await tx('readwrite', s => s.put(v)); blobs.delete(id); await listar(); return true;
  }
  async function remover(id) {
    blobs.delete(id);
    if (st.faixaId === id) pararFaixa(true);
    await tx('readwrite', s => s.delete(id));
    const l = await listar(); if (l.some(f => f.id === id)) throw new Error('A música não foi apagada');
    return true;
  }
  // apaga todas as músicas de um perfil (quando o perfil é apagado)
  async function apagarPerfil(pid) {
    const d = await db();
    await new Promise((res, rej) => {
      const t = d.transaction('faixas', 'readwrite'), r = t.objectStore('faixas').openCursor();
      r.onsuccess = () => { const c = r.result; if (c) { if (perfilDe(c.value) === pid) c.delete(); c.continue(); } };
      t.oncomplete = res; t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
    blobs.clear();
  }
  function definirPerfil(pid) { if (pid && pid !== perfil) { perfil = String(pid); cache = null; blobs.clear(); } }
  /* ---------- backup: a "ficha" de cada música (sem o arquivo de áudio) ---------- */
  async function fichas() { return (await todos()).filter(v => perfilDe(v) !== SOBRA).map(ficha); }
  // o arquivo escolhido é o desta ficha? mesmo tamanho em bytes e mesmo nome de arquivo (ou nome parecido)
  const mesmoNome = (f, nomeArq) => !!nomeArq && ((f.arq && (f.arq === nomeArq || nomeLimpo(f.arq) === nomeLimpo(nomeArq))) || f.nome === nomeLimpo(nomeArq));
  // restaura as fichas de um backup: as músicas cujo arquivo já está no aparelho continuam tocando;
  // as outras ficam marcadas como "faltando arquivo" até a pessoa reencontrá-las
  async function restaurarFichas(lista) {
    lista = Array.isArray(lista) ? lista : [];
    const atuais = await todos();
    const pool = atuais.filter(v => v.blob);
    const tomar = v => { const i = pool.indexOf(v); if (i >= 0) pool.splice(i, 1); return v.blob; };
    const novos = [];
    for (const f of lista) {
      const reg = { id: String(f.id), nome: String(f.nome || 'Música').slice(0, 80), lista: f.lista === 'pausa' ? 'pausa' : 'treino', perfil: String(f.perfil || 'p1'), ordem: Number(f.ordem) || 0, tam: Number(f.tam) || 0, tipo: String(f.tipo || 'audio/mpeg'), arq: String(f.arq || ''), mod: Number(f.mod) || 0, blob: null };
      let achou = pool.find(v => v.id === reg.id && v.blob.size === reg.tam);
      if (!achou && reg.tam) achou = pool.find(v => v.blob.size === reg.tam && (reg.arq ? mesmoNome({ arq: v.arq, nome: v.nome }, reg.arq) : v.nome === reg.nome));
      if (achou) reg.blob = tomar(achou);
      novos.push(reg);
    }
    const agora = Date.now();
    const sobras = pool.filter(v => perfilDe(v) !== SOBRA).map(v => Object.assign({}, v, { perfil: SOBRA, sobra: agora }));
    const d = await db();
    await new Promise((res, rej) => {
      const t = d.transaction('faixas', 'readwrite'), s = t.objectStore('faixas');
      s.clear(); for (const r of novos.concat(sobras)) s.put(r);
      t.oncomplete = res; t.onerror = () => rej(t.error || new Error('Falha ao gravar as músicas'));
      t.onabort = () => rej(t.error || new Error('Gravação das músicas cancelada (talvez falte espaço no aparelho).'));
    });
    // confere
    const volta = await todos(), ids = new Set(volta.map(v => v.id));
    if (novos.some(r => !ids.has(r.id))) throw new Error('A lista de músicas não foi gravada por completo.');
    cache = null; blobs.clear(); await listar();
    return { total: novos.length, comArquivo: novos.filter(r => r.blob).length, faltando: novos.filter(r => !r.blob).length };
  }
  async function faltando() { return (await fichasComFalta()).length; }
  async function fichasComFalta() { return (await todos()).filter(v => perfilDe(v) !== SOBRA && !v.blob); }
  // a pessoa escolhe vários arquivos de uma vez; cada um vai para a(s) ficha(s) que ele completa
  async function reencontrar(arquivos) {
    const falta = await fichasComFalta(), res = { encaixadas: 0, naoUsados: [], faltando: 0 };
    for (const a of Array.from(arquivos || [])) {
      const nomeA = String(a.name || '');
      const mesmoTam = falta.filter(v => !v.blob && v.tam === a.size);
      let alvo = mesmoTam.filter(v => mesmoNome(v, nomeA));
      if (!alvo.length && mesmoTam.length && new Set(mesmoTam.map(v => (v.arq || v.nome))).size === 1) alvo = mesmoTam; // tamanho exato só bate com uma música
      if (!alvo.length) { res.naoUsados.push(nomeLimpo(nomeA)); continue; }
      for (const v of alvo) {
        const novo = Object.assign({}, v, { blob: a, tipo: a.type || v.tipo, arq: v.arq || nomeA });
        try {
          await tx('readwrite', s => s.put(novo));
          const volta = await tx('readonly', s => s.get(v.id));
          if (!volta || !volta.blob || volta.blob.size !== a.size) throw new Error('verificação falhou');
          v.blob = a; res.encaixadas++;
        } catch (e) { res.naoUsados.push(nomeLimpo(nomeA) + ' (não consegui gravar' + (e && e.name === 'QuotaExceededError' ? ': falta espaço' : '') + ')'); break; }
      }
    }
    res.faltando = falta.filter(v => !v.blob).length;
    if (res.encaixadas) pedirPersistencia();
    cache = null; blobs.clear(); await listar();
    return res;
  }
  async function mover(id, dir) {
    const l = await listar(), f = l.find(x => x.id === id); if (!f) return;
    const irm = l.filter(x => x.lista === f.lista), i = irm.indexOf(f), j = i + dir;
    if (j < 0 || j >= irm.length) return;
    const o = irm[j].ordem; await alterar(irm[j].id, { ordem: f.ordem }); await alterar(f.id, { ordem: o });
  }

  /* ---------------- tocar arquivos ---------------- */
  let el = null, elFonte = null, elURL = null, elDesbloqueado = false;
  const SILENCIO = (function () { // wav de 0,05 s em silêncio
    const n = 400, b = new Uint8Array(44 + n), v = new DataView(b.buffer), w = (o, t) => { for (let i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true);
    for (let i = 0; i < n; i++) b[44 + i] = 128;
    let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return 'data:audio/wav;base64,' + btoa(s);
  })();
  function garantirEl() {
    if (el) return el;
    el = new Audio(); el.preload = 'auto'; el.setAttribute('playsinline', '');
    el.addEventListener('ended', () => { if (st.previa) { parar(true); return; } if (st.fonte === 'minhas' && st.tocando) enfileirar(proxima); });
    el.addEventListener('error', () => { if (st.fonte === 'minhas' && st.tocando && !st.previa) { st.erro = 'Não consegui tocar "' + st.nome + '". Pulando.'; setTimeout(() => enfileirar(proxima), 300); } });
    return el;
  }
  function ligarEl() {
    // passa o áudio pelo Web Audio para conseguir abaixar o volume (o iPhone ignora el.volume)
    if (elFonte || !ctx) return;
    try { elFonte = ctx.createMediaElementSource(el); elFonte.connect(faixaG); } catch (e) { elFonte = null; }
  }
  const blobs = new Map(); // últimas músicas lidas, para não reler do armazenamento a cada troca
  let elTk = 0; // cancela pausas atrasadas quando outra música começa
  async function tocarFaixa(f, inicio) {
    garantirEl(); garantirCtx(); ligarEl(); elTk++;
    let v = blobs.get(f.id);
    if (!v) {
      v = await tx('readonly', s => s.get(f.id));
      if (!v || !v.blob) throw new Error('arquivo sumiu');
      blobs.set(f.id, v); if (blobs.size > 6) blobs.delete(blobs.keys().next().value);
    }
    if (elURL) URL.revokeObjectURL(elURL);
    elURL = URL.createObjectURL(v.blob); el.src = elURL;
    if (inicio > 1) { const pular = () => { try { if (!isFinite(el.duration) || inicio < el.duration - 3) el.currentTime = inicio; } catch (e) { /* ok */ } }; if (el.readyState >= 1) pular(); else el.addEventListener('loadedmetadata', pular, { once: true }); }
    st.fonte = 'minhas'; st.nome = v.nome; st.faixaId = v.id;
    if (elFonte) { faixaG.gain.value = 0; rampa(faixaG, 1, 0.8); } else el.volume = conf.vol;
    const p = el.play();
    // nunca deixa a fila travada esperando o aparelho começar a tocar
    if (p && p.then) await Promise.race([p, new Promise(r => setTimeout(r, 4000))]);
  }
  function pararFaixa(imediato) {
    st.faixaId = null;
    if (!el) return;
    if (elFonte && !imediato) { rampa(faixaG, 0, 0.5); const tk = ++elTk; setTimeout(() => { if (tk === elTk) try { el.pause(); } catch (e) { /* ok */ } }, 550); }
    else try { el.pause(); } catch (e) { /* ok */ }
  }

  /* ---------------- controle geral ---------------- */
  function modoEfetivo(tipo, modoPedido) {
    const m = modoPedido && modoPedido !== 'padrao' ? modoPedido : conf.modo;
    if (m === 'off') return 'off';
    if (m === 'minhas' && tocaveis(tipo).length) return 'minhas';
    return 'app';
  }
  let modoPedidoAtual = 'padrao';
  // tocar('treino'|'pausa', { nova: troca de música, modo: modo do treino, ritmo })
  // todos os comandos passam por uma fila: um termina antes do outro começar,
  // e um pedido de tocar que já ficou velho (veio outro depois) é ignorado
  let fila = Promise.resolve(), ultimoPedido = 0;
  const novaPend = { treino: false, pausa: false };
  function enfileirar(fn) {
    const p = fila.then(fn).catch(e => { st.erro = (e && e.message) || 'Falha no som'; });
    fila = p; return p;
  }
  function tocar(tipo, op) {
    op = op || {};
    if (op.nova) novaPend[tipo] = true;
    if (op.modo) modoPedidoAtual = op.modo;
    if (op.ritmo) ritmoMul = Math.min(1.15, Math.max(0.85, 1 / op.ritmo)); // a música acompanha, mas sem exagero
    const n = ++ultimoPedido;
    return enfileirar(async () => {
      if (n !== ultimoPedido) return;
      const o = Object.assign({}, op, { nova: novaPend[tipo] }); novaPend[tipo] = false;
      await tocar2(tipo, o);
    });
  }
  async function tocar2(tipo, op) {
    if (st.previa) parar2(true);
    if (op.modo) modoPedidoAtual = op.modo;
    if (op.ritmo) ritmoMul = Math.min(1.15, Math.max(0.85, 1 / op.ritmo)); // a música acompanha, mas sem exagero
    if (!garantirCtx()) { st.erro = 'Este navegador não toca som gerado.'; return; }
    if (ctx.state === 'suspended') try { ctx.resume(); } catch (e) { /* ok */ }
    const pedido = modoPedidoAtual && modoPedidoAtual !== 'padrao' ? modoPedidoAtual : conf.modo;
    if (cache === null && pedido === 'minhas') { try { await listar(); } catch (e) { cache = []; } }
    const modo = modoEfetivo(tipo, modoPedidoAtual);
    const mesma = st.tocando && st.tipo === tipo && !op.nova && ((modo === 'app' && st.fonte === 'app') || (modo === 'minhas' && st.fonte === 'minhas'));
    if (st.pausado && mesma) { retomar2(); return; }
    if (mesma) return;
    guardarPosicao();
    st.tipo = tipo; st.pausado = false; st.erro = '';
    if (modo === 'off') { parar2(); return; }
    st.tocando = true;
    const u = !op.nova && ultimo[tipo];
    if (modo === 'app') {
      pararFaixa();
      if (u && u.fonte === 'app') iniciarSynth(tipo, u.estilo);
      else { const rk = tipo === 'pausa' ? 'rotPausa' : 'rotTreino'; iniciarSynth(tipo, st[rk]++); }
    } else {
      pararSynth();
      const f = u && u.fonte === 'minhas' && tocaveis(tipo).find(x => x.id === u.id);
      if (f) { try { await tocarFaixa(f, u.tempo); return; } catch (e) { st.aviso = String(e && (e.name + ': ' + e.message)); } }
      await proxima();
    }
  }
  // de onde continuar quando o mesmo tipo voltar (ex.: treino → descanso → treino do mesmo exercício)
  const ultimo = { treino: null, pausa: null };
  function guardarPosicao() {
    if (!st.tocando || !st.tipo) return;
    if (st.fonte === 'app') ultimo[st.tipo] = { fonte: 'app', estilo: st.estilo };
    else if (st.fonte === 'minhas' && st.faixaId) ultimo[st.tipo] = { fonte: 'minhas', id: st.faixaId, tempo: el ? el.currentTime : 0 };
  }
  async function proxima() {
    const tipo = st.tipo, l = tocaveis(tipo); if (!l.length) { st.tocando && iniciarSynth(tipo, 0); return; }
    const rk = tipo === 'pausa' ? 'rotPausa' : 'rotTreino';
    for (let k = 0; k < l.length; k++) {
      const f = l[st[rk]++ % l.length];
      try { await tocarFaixa(f); return; } catch (e) { st.aviso = (e && e.name) + ': ' + (e && e.message); st.erro = 'Não consegui tocar "' + f.nome + '"' + (e && e.name === 'NotAllowedError' ? ' (toque na tela para liberar o som)' : '') + '.'; }
    }
    iniciarSynth(tipo, 0); // nenhuma tocou: usa o som do app para não ficar mudo
  }
  function pausar() { ultimoPedido++; return enfileirar(pausar2); }
  function pausar2() {
    if (!st.tocando || st.pausado) return; st.pausado = true;
    if (st.fonte === 'app') { if (seqTimer) { clearInterval(seqTimer); seqTimer = null; } rampa(synthBus, 0, 0.25); }
    else if (el) { rampa(faixaG, 0, 0.25); const tk = ++elTk; setTimeout(() => { if (tk === elTk && st.pausado) try { el.pause(); } catch (e) { /* ok */ } }, 260); }
  }
  function retomar() { ultimoPedido++; return enfileirar(retomar2); }
  function retomar2() {
    if (!st.pausado) return; st.pausado = false;
    if (ctx && ctx.state === 'suspended') try { ctx.resume(); } catch (e) { /* ok */ }
    if (st.fonte === 'app' && estiloAtual) { seqProx = ctx.currentTime + 0.05; agendar(); seqTimer = setInterval(agendar, 25); rampa(synthBus, 0.8, 0.4); }
    else if (st.fonte === 'minhas' && el) { elTk++; try { const p = el.play(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ok */ } rampa(faixaG, 1, 0.4); }
  }
  function parar(esquecer) { ultimoPedido++; return enfileirar(() => parar2(esquecer)); }
  function parar2(esquecer) {
    st.previa = false;
    if (esquecer) { ultimo.treino = null; ultimo.pausa = null; } else guardarPosicao();
    st.tocando = false; st.pausado = false; st.tipo = null;
    pararSynth(); pararFaixa(); st.fonte = null; st.nome = '';
  }
  let duckN = 0;
  function abaixar(on) {
    duckN = Math.max(0, duckN + (on ? 1 : -1));
    if (!duckG) return;
    rampa(duckG, duckN > 0 && conf.abaixar ? 0.3 : 1, duckN > 0 ? 0.12 : 0.5);
  }
  function soltarAbaixar() { duckN = 0; if (duckG) rampa(duckG, 1, 0.4); }
  function configurar(c) {
    if (c.modo && ['app', 'minhas', 'off'].includes(c.modo)) conf.modo = c.modo;
    if (Number.isFinite(c.vol)) { conf.vol = Math.min(1, Math.max(0, c.vol)); if (master) rampa(master, conf.vol, 0.1); if (el && !elFonte) el.volume = conf.vol; }
    if (typeof c.abaixar === 'boolean') conf.abaixar = c.abaixar;
  }
  // prévia na tela de músicas
  function previa(alvo) {
    desbloquear(); ultimoPedido++;
    const p = fila.then(() => previa2(alvo)); fila = p.catch(() => {});
    return p; // aqui o erro volta para quem pediu, para avisar na tela
  }
  async function previa2(alvo) {
    parar2(true);
    if (!alvo) return;
    st.tocando = true; st.tipo = alvo.estilo !== undefined ? alvo.tipo : alvo.lista;
    if (alvo.estilo !== undefined) { pararFaixa(); iniciarSynth(st.tipo, alvo.estilo); }
    else { await tocarFaixa(alvo); }
    st.previa = true;
  }
  setTimeout(() => { listar().catch(() => { cache = cache || []; }); }, 1500);
  return {
    desbloquear, tocar, pausar, retomar, parar, proxima, abaixar, soltarAbaixar, configurar, previa,
    listar, adicionar, alterar, remover, mover, apagarPerfil, definirPerfil, MAX_POR_LISTA, MAX_MB,
    fichas, restaurarFichas, reencontrar, faltando,
    estilos: tipo => ESTILOS[tipo].map(e => e.nome),
    conf: () => Object.assign({}, conf),
    estado: () => ({ aviso: st.aviso || '', tocando: st.tocando, pausado: st.pausado, tipo: st.tipo, fonte: st.fonte, nome: st.nome, erro: st.erro, ctx: ctx ? ctx.state : 'sem', duck: duckG ? +duckG.gain.value.toFixed(2) : 1, rodada: { treino: st.rotTreino, pausa: st.rotPausa }, elTocando: !!(el && !el.paused) }),
    suportado: !!AC
  };
})();
