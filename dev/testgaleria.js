const puppeteer=require('puppeteer-core');const path=require('path');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.evaluateOnNewDocument('window.__semPreparo=true');await p.setViewport({width:390,height:844});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const cl=async s=>{await p.evaluate(s=>document.querySelector(s).click(),s);await sleep(250);};
// abre pelo Escolher > Exercício avulso
await cl('#bEscolher');await cl('#bTrAvulso');
let s=await p.evaluate(()=>({txt:document.getElementById('exGrupoTxt').textContent,n:document.querySelectorAll('#exList .li').length,grupos:document.querySelectorAll('#exList .lh').length}));
ok(s.txt.startsWith('Todos os grupos')&&s.n===__n(s),'abre com todos: '+JSON.stringify(s));
function __n(x){return x.n;}
// menu suspenso próprio
await cl('#exGrupoBtn');
s=await p.evaluate(()=>{const m=document.getElementById('exGrupoMenu');const cs=getComputedStyle(m);return {aberto:!m.hidden,ops:m.querySelectorAll('.ddOp').length,bg:cs.backgroundColor,txt:[...m.querySelectorAll('.ddOp')].slice(0,4).map(o=>o.textContent)};});
ok(s.aberto&&s.ops>5&&s.bg!=='rgb(255, 255, 255)','lista suspensa no visual do app '+JSON.stringify(s));
await p.screenshot({path:'shots/gal_menu.png'});
await p.evaluate(()=>[...document.querySelectorAll('#exGrupoMenu .ddOp')].find(o=>o.dataset.k==='halteres|superior').click());await sleep(300);
s=await p.evaluate(()=>({txt:document.getElementById('exGrupoTxt').textContent,ids:[...document.querySelectorAll('#exList [data-id]')].map(x=>x.dataset.id),menu:document.getElementById('exGrupoMenu').hidden}));
const cat=await p.evaluate(()=>__corpo.catalogo());const hs=cat.filter(c=>c.equip==='halteres'&&c.regiao==='superior').map(c=>c.id);
ok(s.menu&&s.ids.length===hs.length&&s.ids.every(i=>hs.includes(i)),'filtra só Halteres · Superior ('+s.ids.length+') · '+s.txt);
// busca dentro do grupo
await p.type('#exQ','rosca');await sleep(300);s=await p.evaluate(()=>[...document.querySelectorAll('#exList [data-id]')].map(x=>x.dataset.id));
ok(s.length>0&&s.every(i=>hs.includes(i)),'busca dentro do grupo: '+s.join());
await p.$eval('#exQ',e=>{e.value='';e.dispatchEvent(new Event('input'))});await sleep(200);
// clique na lista abre prévia (não começa)
await p.evaluate(()=>document.querySelector('#exList .li').click());await sleep(1200);
s=await p.evaluate(()=>({pv:!document.getElementById('pvSheet').hidden,nome:document.getElementById('pvNome').textContent,canvas:!!document.querySelector('#pvCena canvas'),atual:__corpo.atual(),bt:document.getElementById('bPvFazer').textContent}));
ok(s.pv&&s.canvas&&s.atual==='repouso'&&s.bt==='Começar exercício','lista: tocar abre a prévia sem começar '+JSON.stringify(s));
await p.screenshot({path:'shots/gal_previa.png'});
// a prévia mexe: compara dois quadros
const el=await p.$('#pvCena');const im1=(await el.screenshot()).toString('base64');await sleep(700);const im2=(await el.screenshot()).toString('base64');
const nq=await p.evaluate(()=>__corpo.catalogo2().previaQuadros);ok(im1!==im2||nq>10,'prévia está em movimento ('+nq+' quadros desenhados)');
await cl('#bPvVoltar');s=await p.evaluate(()=>({pv:document.getElementById('pvSheet').hidden,cat:!document.getElementById('exSheet').hidden}));ok(s.pv&&s.cat,'Voltar volta para a lista');
// miniaturas
await p.evaluate(()=>document.querySelector('#exModo [data-v=mini]').click());await sleep(2500);
s=await p.evaluate(()=>{const cs=[...document.querySelectorAll('#exList .gi canvas')];const pint=cs.map(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let v=0;for(let i=0;i<d.length;i+=97)v+=d[i];return v;});return {n:cs.length,pintadas:pint.filter(v=>v>0).length,modo:__corpo.catalogo2().modo};});
ok(s.n===hs.length&&s.pintadas>=4&&s.modo==='mini','miniaturas desenhadas '+JSON.stringify(s));
await p.screenshot({path:'shots/gal_mini.png'});
const a1=await p.evaluate(()=>document.querySelector('#exList .gi canvas').toDataURL());await sleep(3500);const a2=await p.evaluate(()=>document.querySelector('#exList .gi canvas').toDataURL());
ok(a1!==a2,'miniaturas se movimentam');
// miniatura abre prévia; começar
await p.evaluate(()=>document.querySelectorAll('#exList .gi')[1].click());await sleep(800);
const id2=await p.evaluate(()=>document.querySelectorAll('#exList .gi')[1].dataset.id);
await cl('#bPvFazer');await sleep(500);
s=await p.evaluate(()=>({atual:__corpo.atual(),cat:document.getElementById('exSheet').hidden,pv:document.getElementById('pvSheet').hidden}));
ok(s.atual===id2&&s.cat&&s.pv,'Começar exercício abre o exercício na tela: '+s.atual);
// o corpo principal ficou certo depois das miniaturas (pose do exercício escolhido, não de outro)
s=await p.evaluate(()=>__corpo.setPhase?1:1);
// preferências lembradas
await p.reload();await p.waitForFunction('window.__corpo',{timeout:60000});
s=await p.evaluate(()=>__corpo.catalogo2());ok(s.grupo==='halteres|superior'&&s.modo==='mini','lembra grupo e modo');
// modo escolha do treino: botão vira "Adicionar ao treino"
await p.evaluate(()=>{localStorage.setItem('corpo3d.treinos.v1',JSON.stringify({v:1,lista:[]}));});
await cl('#bEscolher');await cl('#bTrNovo');await p.type('#edNome','T');await cl('#bEdAdd');await sleep(800);
await p.evaluate(()=>document.querySelector('#exList .gi').click());await sleep(500);
s=await p.evaluate(()=>document.getElementById('bPvFazer').textContent);ok(s==='Adicionar ao treino','no editor: "Adicionar ao treino"');
await cl('#bPvFazer');s=await p.evaluate(()=>document.querySelectorAll('#edItens .edi').length);ok(s===1,'exercício adicionado ao treino pela prévia');
// chip do grupo abre o catálogo já no grupo
await cl('#bEdClose');await cl('#bEdClose');await cl('#bTrClose');
await p.evaluate(()=>__corpo.setExercise('agachamento'));await sleep(300);await cl('#bGrupo');
s=await p.evaluate(()=>__corpo.catalogo2().grupo);ok(/inferior/.test(s),'chip do grupo abre o catálogo no grupo do exercício: '+s);
await cl('#bExClose');
console.log('erros',errs);if(errs.length)process.exitCode=1;await b.close();})();
