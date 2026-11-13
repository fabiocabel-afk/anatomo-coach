const puppeteer=require('puppeteer-core');const fs=require('fs');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const dir='/tmp/prof_backup',dl='/tmp/dl_backup';fs.rmSync(dir,{recursive:true,force:true});fs.rmSync(dl,{recursive:true,force:true});fs.mkdirSync(dl,{recursive:true});
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',userDataDir:dir,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage();await p.setViewport({width:390,height:844});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const cdp=await p.target().createCDPSession();await cdp.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:dl}).catch(()=>cdp.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:dl}));
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const cl=async s=>{await p.evaluate(s=>document.querySelector(s).click(),s);await sleep(300);};
const carregar=async()=>{await p.waitForFunction('window.__corpo',{timeout:60000});await sleep(400);};
const estado=()=>p.evaluate(async()=>{const pf=__corpo.perfis();const o={pf:pf.lista.map(x=>x.id+':'+x.nome).join(','),atual:pf.atual};for(const x of pf.lista){o['h_'+x.id]=__corpo.historico(x.id).length;o['c_'+x.id]=JSON.stringify(__corpo.corpo(x.id).medidas||{});}o.tr=__corpo.treinos().map(t=>t.nome).join(',');o.mus=(await Musica.listar()).map(f=>f.nome+(f.falta?'(falta)':'')).join(',');return o;});
await p.goto('http://localhost:8766/index.html');await carregar();
// ---- monta dados: 2 perfis, histórico, peso, treino, 2 músicas
await p.evaluate(()=>{localStorage.clear();
  localStorage.setItem('anatomotion.perfis.v1',JSON.stringify({v:1,lista:[{id:'p1',nome:'Fabio',cor:'#642A90',criado:1},{id:'pana',nome:'Ana',cor:'#EC357D',criado:2}],atual:'p1'}));
  const h=n=>JSON.stringify({v:1,lista:Array.from({length:n},(_,i)=>({dia:'2026-11-0'+(1+i%9),inicio:1762000000000+i*1e6,fim:1762000100000+i*1e6,ex:'agachamento',ciclos:3,reps:10}))});
  localStorage.setItem('anatomotion.historico.v1@p1',h(7));localStorage.setItem('anatomotion.historico.v1@pana',h(3));
  localStorage.setItem('anatomotion.corpo.v1@p1',JSON.stringify({v:1,sexo:'M',altura:178,medidas:{peso:[{d:'2026-11-10',v:82.5,t:1}]}}));
  localStorage.setItem('corpo3d.treinos.v1@p1',JSON.stringify({v:1,lista:[{id:'t1',nome:'Pernas',trilha:'padrao',itens:[{ex:'agachamento',reps:5,ciclos:1,descanso:10,pausaRep:0,ritmo:1,depois:10}]}]}));
  localStorage.setItem('corpo3d.catalogo.v1@p1',JSON.stringify({grupo:'todos',modo:'lista',favs:['agachamento'],soFav:false}));
});
await p.reload();await carregar();
await cl('#bEscolher');await cl('#bTrMusica');
await p.$('#muFile_treino').then(i=>i.uploadFile('/tmp/aud/Treino 2.wav'));await p.waitForFunction(()=>document.querySelectorAll('#muL_treino .mur').length===1,{timeout:15000});
await p.$('#muFile_pausa').then(i=>i.uploadFile('/tmp/aud/Relax pausa.wav'));await p.waitForFunction(()=>document.querySelectorAll('#muL_pausa .mur').length===1,{timeout:15000});
await cl('#bMuClose');await cl('#bTrClose');
const orig=await estado();console.log(JSON.stringify(orig));
ok(orig.h_p1===7&&orig.h_pana===3&&orig.tr==='Pernas'&&orig.mus==='Treino 2,Relax pausa','dados de partida');
// ---- tela de backup + exportar arquivo
await cl('#bPerfil');ok(await p.evaluate(()=>!document.getElementById('pfBkLinha').hidden),'botão Backup dos dados na lista de perfis');
await cl('#bPfBackup');await sleep(500);
let t=await p.evaluate(()=>({tit:document.getElementById('pfTitulo').textContent,txt:document.getElementById('pfList').innerText,bk:document.getElementById('pfBkLinha').hidden}));
ok(t.tit==='Backup dos dados'&&/Nenhum backup feito ainda/.test(t.txt)&&/Prote/.test(t.txt)&&t.bk,'tela de backup');
await p.screenshot({path:'shots/backup_tela.png'});
await cl('#bBkSalvar');await sleep(1500);
const arqs=fs.readdirSync(dl).filter(f=>f.endsWith('.json'));ok(arqs.length===1&&/^anatomotion-backup-\d{4}-\d\d-\d\d-\d{4}\.json$/.test(arqs[0]),'arquivo baixado '+arqs.join());
const bk=JSON.parse(fs.readFileSync(dl+'/'+arqs[0],'utf8'));
ok(bk.app==='AnatoMotion'&&bk.perfis.lista.length===2&&Object.keys(bk.dados).length>=5&&bk.musicas.length===2&&bk.musicas.every(m=>m.arq&&m.tam>0)&&!JSON.stringify(bk).includes('blob'),'conteúdo do backup (sem áudio, com ficha das músicas) '+Object.keys(bk.dados).join(' '));
t=await p.evaluate(()=>document.getElementById('pfList').innerText);ok(/Último backup: \d\d\/\d\d\/\d{4}/.test(t)&&/salvo em Downloads/.test(t),'mostra último backup');
fs.writeFileSync('/tmp/bk_ok.json',JSON.stringify(bk));
const ruim=JSON.parse(JSON.stringify(bk));ruim.dados['xx.estranho@p1']='{}';fs.writeFileSync('/tmp/bk_ruim.json',JSON.stringify(ruim));
// ---- Enviar (simula o compartilhar do Android, que só aceita ser chamado no toque e recusa .json)
await p.evaluate(()=>{window.__env=[];navigator.canShare=()=>true;navigator.share=function(d){const f=d.files[0];const noToque=navigator.userActivation?navigator.userActivation.isActive:true;window.__env.push({nome:f.name,tipo:f.type,noToque});if(/\.json$/.test(f.name))return Promise.reject(new DOMException('Permission denied','NotAllowedError'));return f.text().then(t=>{window.__envTxt=t;});};});
await cl('#bPfVoltar');await cl('#bPfBackup');await sleep(800);
ok(await p.evaluate(()=>!!document.getElementById('bBkEnviar')),'botão Enviar aparece');
await p.click('#bBkEnviar');await sleep(800);
let env=await p.evaluate(()=>({e:window.__env,t:document.getElementById('pfList').innerText,ok:(()=>{try{return JSON.parse(window.__envTxt).app==='AnatoMotion'}catch(e){return false}})()}));
ok(env.e.length===1&&/\.txt$/.test(env.e[0].nome)&&env.e[0].tipo==='text/plain'&&env.e[0].noToque&&env.ok&&/Backup enviado/.test(env.t),'Enviar: arquivo .txt, chamado no toque, conteúdo válido '+JSON.stringify(env.e));
fs.writeFileSync('/tmp/bk_enviado.txt',await p.evaluate(()=>window.__envTxt));
await p.evaluate(()=>{navigator.share=()=>Promise.reject(new DOMException('Permission denied','NotAllowedError'));});
await p.click('#bBkEnviar');await sleep(600);
ok(/não deixou enviar/.test(await p.evaluate(()=>document.getElementById('pfList').innerText)),'Enviar recusado pelo celular: orienta usar Salvar arquivo');
// ---- arquivo errado / danificado: nada muda
await p.$('#bkArquivo').then(i=>i.uploadFile('/tmp/aud/texto.txt'));await sleep(600);
t=await p.evaluate(()=>document.getElementById('pfList').innerText);ok(/não está no formato de backup/.test(t)&&/Nada foi alterado/.test(t),'arquivo que não é backup é recusado');
await p.$('#bkArquivo').then(i=>i.uploadFile('/tmp/bk_ruim.json'));await sleep(600);
t=await p.evaluate(()=>document.getElementById('pfList').innerText);ok(/item desconhecido/.test(t),'backup alterado é recusado');
ok(JSON.stringify(await estado())===JSON.stringify(orig),'dados intactos após arquivos recusados');
// ---- falha de gravação no meio: volta tudo e não recarrega
await p.evaluate(()=>{const o=Storage.prototype.setItem;let n=0;Storage.prototype.setItem=function(k,v){if(k==='anatomotion.historico.v1@pana'&&n++===0){Storage.prototype.setItem=o;throw new DOMException('cheio','QuotaExceededError');}return o.call(this,k,v);};});
const bk2=JSON.parse(JSON.stringify(bk));bk2.perfis.lista[1].nome='Ana B';
await p.evaluate(o=>__corpo.backup.aplicar(o),bk2);await sleep(800);
t=await p.evaluate(()=>document.getElementById('pfList').innerText);ok(/Os dados atuais foram mantidos/.test(t),'falha no meio: avisa');
ok(JSON.stringify(await estado())===JSON.stringify(orig),'falha no meio: dados exatamente como antes');
// ---- simula limpeza do navegador
await p.evaluate(async()=>{localStorage.clear();await new Promise(r=>{const q=indexedDB.deleteDatabase('corpo3d');q.onsuccess=q.onerror=q.onblocked=r;});});
await p.reload();await carregar();
const vazio=await estado();ok(vazio.h_p1===0&&vazio.tr===''&&vazio.mus==='','app zerado depois da limpeza');
// ---- importar pelo botão
await cl('#bPerfil');await cl('#bPfBackup');await p.$('#bkArquivo').then(i=>i.uploadFile('/tmp/bk_enviado.txt'));await sleep(700);
t=await p.evaluate(()=>document.getElementById('pfList').innerText);
ok(/2 perfis: Fabio, Ana/.test(t)&&/10 exercícios feitos/.test(t)&&/1 treino/.test(t)&&/2 músicas/.test(t),'resumo antes de restaurar');
await p.screenshot({path:'shots/backup_confirmar.png'});
await Promise.all([p.waitForNavigation({timeout:60000}),cl('#bBkRestaurar')]);await carregar();await sleep(500);
t=await p.evaluate(()=>({vis:!document.getElementById('pfSheet').hidden,txt:document.getElementById('pfList').innerText}));
ok(t.vis&&/Backup restaurado/.test(t.txt)&&/2 músicas precisam/.test(t.txt),'depois de reabrir: aviso de restaurado');
await sleep(500);t=await p.evaluate(()=>document.getElementById('pfList').innerText);ok(/Reencontrar músicas/.test(t)&&/Desfazer a última restauração/.test(t),'botões reencontrar e desfazer');
await p.screenshot({path:'shots/backup_restaurado.png'});
let r=await estado();
ok(r.pf===orig.pf&&r.h_p1===7&&r.h_pana===3&&r.c_p1===orig.c_p1&&r.tr==='Pernas'&&r.mus==='Treino 2(falta),Relax pausa(falta)','dados de volta, músicas marcadas como faltando '+r.mus);
ok(await p.evaluate(()=>__corpo.catalogo2().favs.includes('agachamento')),'favoritos de volta');
// trilha sonora mostra faltando e não trava o som
await cl('#bPfClose');await cl('#bEscolher');await cl('#bTrMusica');await sleep(500);
t=await p.evaluate(()=>({box:!document.getElementById('muFalta').hidden,tx:document.getElementById('muFaltaTx').textContent,linhas:document.querySelectorAll('#muSheet .mur.falta').length}));
ok(t.box&&t.linhas===2,'trilha sonora: aviso e linhas faltando');
await p.screenshot({path:'shots/backup_musicas_faltando.png'});
// reencontrar: escolhe vários arquivos de uma vez (inclusive um que não é de nenhuma)
await p.$('#muAchar').then(i=>i.uploadFile('/tmp/aud/Relax pausa.wav','/tmp/aud/Treino 2.wav','/tmp/aud/Minha_Musica_Treino_1.wav'));
await p.waitForFunction(()=>document.querySelectorAll('#muSheet .mur.falta').length===0,{timeout:15000});await sleep(300);
t=await p.evaluate(()=>({m:document.getElementById('muMsg').textContent,box:document.getElementById('muFalta').hidden}));
ok(/2 músicas voltaram/.test(t.m)&&/Não usados: Minha Musica Treino 1/.test(t.m)&&/completas/.test(t.m)&&t.box,'reencontrar encaixa cada arquivo: '+t.m);
r=await estado();ok(r.mus==='Treino 2,Relax pausa','músicas completas');
// toca a música reencontrada
await p.evaluate(async()=>{const l=await Musica.listar();await Musica.previa(l[0]);});await sleep(800);
ok(await p.evaluate(()=>Musica.estado().elTocando),'música reencontrada toca');
await p.evaluate(()=>Musica.parar(true));await cl('#bMuClose');await cl('#bTrClose');
// ---- desfazer volta ao estado de antes (vazio); os arquivos ficam guardados à parte
await cl('#bPerfil');await cl('#bPfBackup');await sleep(400);
await cl('#bBkDesfazer');await Promise.all([p.waitForNavigation({timeout:60000}),cl('#bBkDesfazer')]);await carregar();await sleep(400);
r=await estado();ok(r.h_p1===0&&r.tr===''&&r.mus===''&&/Dados de antes/.test(await p.evaluate(()=>document.getElementById('pfList').innerText)),'desfazer volta ao estado anterior');
// ---- importar de novo: as músicas voltam sozinhas (arquivos já estavam no aparelho)
await cl('#bPfBackup').catch(()=>{});await p.$('#bkArquivo').then(i=>i.uploadFile('/tmp/bk_ok.json'));await sleep(600);
await Promise.all([p.waitForNavigation({timeout:60000}),cl('#bBkRestaurar')]);await carregar();await sleep(400);
r=await estado();ok(r.mus==='Treino 2,Relax pausa'&&r.h_p1===7,'restaurar de novo: músicas já encaixadas sozinhas '+r.mus);
// perfil Ana também
const txt=await p.evaluate(()=>document.getElementById('pfList').innerText);ok(/Backup restaurado\./.test(txt)&&!/precisa/.test(txt),'sem músicas faltando');
// ---- proteção (headless costuma negar; só confere que mostra algo)
t=await p.evaluate(()=>document.getElementById('bkProt').innerText);ok(/Proteção/.test(t),'status da proteção: '+t.split('\n')[0]);
// voltar do Android: backup → lista → fecha
await p.evaluate(()=>history.back());await sleep(500);ok(await p.evaluate(()=>document.getElementById('pfTitulo').textContent==='Perfis'),'voltar do celular: backup → perfis');
ok(errs.length===0,'sem erros: '+errs.join(' | '));
await b.close();})().catch(e=>{console.error(e);process.exit(1);});
