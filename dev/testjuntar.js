// v2.42.0: importar backup → Juntar com os dados daqui (vários aparelhos) e compartilhar treino por link/arquivo
const puppeteer=require('puppeteer-core');const path=require('path');const fs=require('fs');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const cl=async s=>{await p.evaluate(s=>document.querySelector(s).click(),s);await sleep(300);};
const carregar=async()=>{await p.waitForFunction('window.__corpo',{timeout:60000});await sleep(400);};
const URL0='file://'+path.resolve('dist/corpo3d.html');
await p.goto(URL0);await carregar();
// ---------- aparelho B (TV): gera o backup ----------
await p.evaluate(()=>{localStorage.clear();
  localStorage.setItem('anatomotion.perfis.v1',JSON.stringify({v:1,lista:[{id:'pTV1',nome:'Fábio',cor:'#642A90',criado:1},{id:'pTV2',nome:'Ana',cor:'#EC357D',criado:2}],atual:'pTV1'}));
  const h=(id,ex,ini)=>({id,ex,nome:ex,dia:new Date(ini).toISOString().slice(0,10),inicio:ini,fim:ini+60000,ativoSeg:60,ciclos:1,reps:10});
  localStorage.setItem('anatomotion.historico.v1@pTV1',JSON.stringify({v:1,lista:[h('hA','rosca',Date.parse('2026-11-10T10:00:00')),h('hTV','agachamento',Date.parse('2026-11-12T10:00:00'))]}));
  localStorage.setItem('corpo3d.treinos.v1@pTV1',JSON.stringify({v:1,lista:[{id:'tComum',nome:'Braços',trilha:'padrao',itens:[{ex:'rosca',reps:12,ciclos:3,descanso:30,pausaRep:0,ritmo:1,depois:60}],criado:1,alterado:Date.parse('2026-11-12')},{id:'tTV',nome:'Pernas TV',trilha:'padrao',itens:[{ex:'agachamento',reps:10,ciclos:2,descanso:30,pausaRep:0,ritmo:1,depois:60}],criado:5,alterado:5}]}));
  localStorage.setItem('anatomotion.corpo.v1@pTV1',JSON.stringify({v:1,sexo:'M',altura:178,medidas:{peso:[{d:'2026-11-01',v:80,t:100},{d:'2026-11-05',v:79.5,t:500}],cintura:[{d:'2026-11-05',v:86,t:500}]}}));
  localStorage.setItem('corpo3d.catalogo.v1@pTV1',JSON.stringify({grupo:'todos',modo:'lista',favs:['prancha'],soFav:false}));
  localStorage.setItem('anatomotion.historico.v1@pTV2',JSON.stringify({v:1,lista:[h('hAna','prancha',Date.parse('2026-11-11T10:00:00'))]}));
});
await p.reload();await carregar();
const bkTV=await p.evaluate(async()=>(await __corpo.backup.montar()).txt);
fs.writeFileSync('/tmp/bk_tv.txt',bkTV);
// ---------- aparelho A (celular): dados próprios ----------
await p.evaluate(()=>{localStorage.clear();
  localStorage.setItem('anatomotion.perfis.v1',JSON.stringify({v:1,lista:[{id:'pCel',nome:'Fabio',cor:'#0164C9',criado:9}],atual:'pCel'}));
  const h=(id,ex,ini)=>({id,ex,nome:ex,dia:new Date(ini).toISOString().slice(0,10),inicio:ini,fim:ini+60000,ativoSeg:60,ciclos:1,reps:10});
  localStorage.setItem('anatomotion.historico.v1@pCel',JSON.stringify({v:1,lista:[h('hA','rosca',Date.parse('2026-11-10T10:00:00')),h('hCel','prancha',Date.parse('2026-11-13T10:00:00'))]}));
  localStorage.setItem('corpo3d.treinos.v1@pCel',JSON.stringify({v:1,lista:[{id:'tComum',nome:'Braços (velho)',trilha:'padrao',itens:[{ex:'rosca',reps:8,ciclos:2,descanso:30,pausaRep:0,ritmo:1,depois:60}],criado:1,alterado:Date.parse('2026-11-01')},{id:'tCel',nome:'Core',trilha:'padrao',itens:[{ex:'prancha',reps:30,ciclos:2,descanso:30,pausaRep:0,ritmo:1,depois:60}],criado:7,alterado:7}]}));
  localStorage.setItem('anatomotion.corpo.v1@pCel',JSON.stringify({v:1,sexo:'M',altura:178,medidas:{peso:[{d:'2026-11-05',v:79.9,t:400},{d:'2026-11-08',v:79.2,t:800}]}}));
  localStorage.setItem('corpo3d.catalogo.v1@pCel',JSON.stringify({grupo:'eq:halteres',modo:'lista',favs:['rosca'],soFav:false}));
  localStorage.setItem('corpo3d.treino.v1@pCel',JSON.stringify({reps:9,ciclos:3,descanso:30,voz:true,ritmo:1}));
});
await p.reload();await carregar();
await cl('#bPerfil');await cl('#bPfBackup');
const inp=await p.$('#bkArquivo');await inp.uploadFile('/tmp/bk_tv.txt');await sleep(600);
let s=await p.evaluate(()=>({j:!!document.getElementById('bBkJuntar'),sub:!!document.getElementById('bBkSubstituir'),r:!!document.getElementById('bBkRestaurar')}));
ok(s.j&&s.sub&&!s.r,'ao importar, pergunta: Juntar ou Substituir');
await cl('#bBkJuntar');await sleep(300);
s=await p.evaluate(()=>({sel:[...document.querySelectorAll('.bkMapa select')].map(x=>x.dataset.pid+'='+x.value),prev:document.getElementById('bkPrev')?.textContent}));
ok(s.sel.join()==='pTV1=pCel,pTV2=novo','sugestão: "Fábio" junta com "Fabio" (sem acento), "Ana" vira perfil novo '+s.sel.join());
ok(/2 exercícios feitos · 1 treino · 2 medidas · 1 perfil novo/.test(s.prev||''),'prévia do que entra: '+s.prev);
await p.screenshot({path:'shots/juntar.png'});
await Promise.all([p.waitForNavigation({timeout:60000}),cl('#bBkConfJuntar')]);await carregar();await sleep(400);
s=await p.evaluate(()=>{const J=k=>JSON.parse(localStorage.getItem(k)||'null');const reg=J('anatomotion.perfis.v1');const ana=reg.lista.find(x=>x.nome==='Ana');
  return {msg:document.getElementById('bkMsg')?.textContent,perfis:reg.lista.map(x=>x.nome).join(),atual:reg.atual,
   hist:J('anatomotion.historico.v1@pCel').lista.map(r=>r.id).join(),
   trs:J('corpo3d.treinos.v1@pCel').lista.map(t=>t.id+':'+t.nome).join(),
   peso:J('anatomotion.corpo.v1@pCel').medidas.peso.map(r=>r.d+'='+r.v).join(),cint:(J('anatomotion.corpo.v1@pCel').medidas.cintura||[]).length,
   favs:J('corpo3d.catalogo.v1@pCel').favs.sort().join(),grupo:J('corpo3d.catalogo.v1@pCel').grupo,cfg:J('corpo3d.treino.v1@pCel').reps,
   ana:ana&&J('anatomotion.historico.v1@'+ana.id).lista.length,antes:!!localStorage.getItem('anatomotion.backup.antes')};});
ok(/Dados juntados/.test(s.msg||''),'mensagem: '+s.msg);
ok(s.perfis==='Fabio,Ana'&&s.atual==='pCel','perfis: o daqui continua (e em uso) + Ana nova');
ok(s.hist==='hA,hCel,hTV'.split(',').sort((a,b)=>({hA:1,hTV:3,hCel:4}[a]-{hA:1,hTV:3,hCel:4}[b])).join()||s.hist==='hA,hTV,hCel','exercícios feitos juntos, sem repetir o mesmo registro, em ordem de data: '+s.hist);
ok(s.trs==='tComum:Braços,tCel:Core,tTV:Pernas TV','treinos juntos; o mesmo treino fica com a versão alterada por último: '+s.trs);
ok(s.peso==='2026-11-01=80,2026-11-05=79.5,2026-11-08=79.2'&&s.cint===1,'peso: todas as datas; mesma data → a registrada por último ('+s.peso+')');
ok(s.favs==='prancha,rosca'&&s.grupo==='eq:halteres'&&s.cfg===9,'favoritos somados; ajustes deste aparelho mantidos');
ok(s.ana===1&&s.antes,'Ana com o histórico dela; cópia para desfazer guardada');
// juntar de novo o mesmo arquivo: nada muda
await cl('#bPfVoltar').catch(()=>{});
await p.evaluate(()=>{document.getElementById('pfSheet').hidden=true;});await cl('#bPerfil');await cl('#bPfBackup');
const inp2=await p.$('#bkArquivo');await inp2.uploadFile('/tmp/bk_tv.txt');await sleep(600);await cl('#bBkJuntar');await sleep(300);
s=await p.evaluate(()=>({sel:[...document.querySelectorAll('.bkMapa select')].map(x=>x.dataset.pid+'='+x.options[x.selectedIndex].text).join(),prev:document.getElementById('bkPrev')?.textContent}));
ok(/Nada vai mudar/.test(s.prev||'')&&/pTV2=Juntar com Ana/.test(s.sel),'importar o mesmo arquivo de novo: nada a acrescentar (Ana já sugerida) '+s.prev);
// desfazer volta ao estado de antes da junção
await cl('.bkConf button');// cancelar
await cl('#bBkDesfazer');await Promise.all([p.waitForNavigation({timeout:60000}),cl('#bBkDesfazer')]);await carregar();await sleep(400);
s=await p.evaluate(()=>JSON.parse(localStorage.getItem('anatomotion.perfis.v1')).lista.map(x=>x.nome).join()+'|'+JSON.parse(localStorage.getItem('anatomotion.historico.v1@pCel')).lista.length);
ok(s==='Fabio|2','desfazer volta aos dados de antes da junção: '+s);
// ---------- compartilhar treino ----------
await p.evaluate(()=>{document.getElementById('pfSheet').hidden=true;});
await p.evaluate(()=>{navigator.clipboard.writeText=t=>{window.__copiado=t;return Promise.resolve();};});
await cl('#bTreinos');
await p.evaluate(()=>[...document.querySelectorAll('#trList .trc')].find(c=>/Braços/.test(c.textContent)).querySelector('button[aria-label^="Compartilhar"]').click());await sleep(250);
ok(await p.evaluate(()=>!!document.getElementById('trShare')),'botão compartilhar abre as opções do treino');
await p.screenshot({path:'shots/compartilhar.png'});
await cl('#bTrCopiar');
const link=await p.evaluate(()=>window.__copiado||'');
ok(/https:\/\/fabiocabel-afk\.github\.io\/anatomo-coach\/#treino=j[A-Za-z0-9_-]+/.test(link)&&link.length<1200,'link copiado ('+link.length+' caracteres)');
ok(/copiado/.test(await p.evaluate(()=>document.getElementById('trMsg').textContent)),'aviso de link copiado');
// receber: abre o app com o link (outro aparelho, perfil sem treinos)
const hash=link.slice(link.indexOf('#'));
await p.evaluate(()=>{localStorage.setItem('corpo3d.treinos.v1@pCel',JSON.stringify({v:1,lista:[{id:'tX',nome:'Braços',trilha:'padrao',itens:[{ex:'prancha',reps:30,ciclos:1,descanso:30,pausaRep:0,ritmo:1,depois:60}],criado:1,alterado:1}]}));});
await p.goto(URL0+hash);await carregar();await sleep(500);
s=await p.evaluate(()=>({vis:!document.getElementById('rcSheet').hidden,nome:document.querySelector('.rcNome')?.textContent,itens:[...document.querySelectorAll('.rcLista li b')].map(x=>x.textContent),sub:document.querySelector('.rcLista small')?.textContent,hash:location.hash}));
ok(s.vis&&s.nome==='Braços (velho)'&&s.itens.length===1&&/8 reps · 2 ciclos/.test(s.sub)&&s.hash==='','link abre o "Treino recebido" com os exercícios e ajustes; o link sai da barra '+JSON.stringify(s));
await p.screenshot({path:'shots/recebido.png'});
await cl('#bRcAdd');
s=await p.evaluate(()=>({trs:JSON.parse(localStorage.getItem('corpo3d.treinos.v1@pCel')).lista.map(t=>t.nome+':'+t.itens[0].reps),msg:document.getElementById('trMsg').textContent}));
ok(s.trs.join()==='Braços (velho):8,Core:30,Braços (velho) (2):8'&&/adicionado/.test(s.msg),'adicionado com outro nome (já tinha o mesmo nome): '+s.trs.join());
// arquivo recebido
const pacote=await p.evaluate(()=>JSON.stringify({app:'AnatoMotion',tipo:'treino',formato:1,nome:'Do amigo',trilha:'minhas',itens:[['agachamento',15,3,45,0,1,60],['nao_existe',10,1,30,0,1,60]]}));
fs.writeFileSync('/tmp/treino_amigo.txt',pacote);
await p.evaluate(()=>{document.getElementById('trSheet').hidden=false;});
const inp3=await p.$('#trArquivo');await inp3.uploadFile('/tmp/treino_amigo.txt');await sleep(500);
s=await p.evaluate(()=>({nome:document.querySelector('.rcNome')?.textContent,nota:document.querySelector('#rcCorpo .nota')?.textContent,n:document.querySelectorAll('.rcLista li').length,topo:getComputedStyle(document.getElementById('rcSheet')).zIndex}));
ok(s.nome==='Do amigo'&&s.n===1&&/1 exercício não existe/.test(s.nota),'arquivo recebido: abre, avisa o exercício desconhecido '+s.nota);
await p.goto('about:blank');await p.goto(URL0+hash);await carregar();await sleep(500);
ok(await p.evaluate(()=>!document.getElementById('rcSheet').hidden&&document.querySelector('.rcNome').textContent==='Braços (velho)'),'abrindo o app pelo link (app fechado): mostra o treino recebido');
// link quebrado
await p.goto('about:blank');await p.goto(URL0+'#treino=jxxx');await carregar();await sleep(500);
s=await p.evaluate(()=>({vis:!document.getElementById('rcSheet').hidden,msg:document.querySelector('#rcCorpo .msg')?.textContent,add:document.getElementById('bRcAdd').hidden}));
ok(s.vis&&/Não reconheci/.test(s.msg||'')&&s.add,'link incompleto: avisa e não deixa adicionar');
console.log('erros',errs.filter(e=>!/clipboard/i.test(e)));if(errs.filter(e=>!/clipboard/i.test(e)).length)process.exitCode=1;await b.close();})().catch(e=>{console.error('EXC',e);process.exit(1);});
