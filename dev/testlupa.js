// Lupa: Partes do corpo | Objetos | Músculos — todos os exercícios aparecem, agrupados; prévia ao tocar
const puppeteer=require('puppeteer-core');const path=require('path');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:390,height:844});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const todos=await p.evaluate(()=>__corpo.catalogo().map(c=>c.id));
await p.evaluate(()=>document.getElementById('bList').click());await sleep(300);
const estado=()=>p.evaluate(()=>({modo:[...document.querySelectorAll('#qModo button')].filter(b=>b.classList.contains('on')).map(b=>b.textContent)[0],grupos:[...document.querySelectorAll('#list .lh')].map(h=>h.textContent),ids:[...new Set([...document.querySelectorAll('#list .liEx')].map(i=>i.dataset.ex))],n:document.querySelectorAll('#list .li').length}));
let e=await estado();
ok(e.modo==='Partes do corpo','abre em "Partes do corpo"');
const faltam=todos.filter(id=>!e.ids.includes(id));ok(faltam.length===0&&e.ids.length===todos.length,'todos os '+todos.length+' exercícios aparecem por parte do corpo'+(faltam.length?' — faltam: '+faltam.join(','):''));
ok(['Abdômen','Coxa','Glúteo e quadril','Perna e joelho','Braços','Costas','Peito','Ombros'].every(g=>e.grupos.some(h=>h.startsWith(g+' · '))),'grupos: '+e.grupos.join(' | '));
const w=await p.evaluate(()=>[...document.querySelectorAll('#qModo button')].map(b=>Math.round(b.getBoundingClientRect().width)));ok(Math.max(...w)-Math.min(...w)<=1,'três botões da mesma largura '+w);
await p.screenshot({path:'shots/lupa_corpo.png'});
// busca "perna"
await p.focus('#q');await p.keyboard.type('perna');await sleep(300);e=await estado();
ok(e.grupos.some(g=>g.startsWith('Perna e joelho'))&&e.ids.length>3,'buscar "perna": '+e.grupos.join(' | '));
await p.evaluate(()=>{const q=document.getElementById('q');q.value='rosca';q.dispatchEvent(new Event('input'));});await sleep(300);e=await estado();
ok(e.ids.length>=3&&e.ids.every(id=>/rosca/.test(id)),'buscar "rosca": '+e.ids.join(','));
// objetos
await p.evaluate(()=>{const q=document.getElementById('q');q.value='';q.dispatchEvent(new Event('input'));document.querySelector('#qModo [data-v="objetos"]').click();});await sleep(300);e=await estado();
ok(JSON.stringify(e.grupos.map(g=>g.split(' · ')[0]))===JSON.stringify(['Halteres','Barra','Anilha','Caneleira','Garrafas','Sem objetos (só o corpo)']),'objetos: '+e.grupos.join(' | '));
ok(e.ids.length===todos.length,'todos os exercícios aparecem por objeto ('+e.ids.length+')');
const garr=await p.evaluate(()=>{const out=[];let g='';for(const el of document.querySelectorAll('#list > *')){if(el.classList.contains('lh'))g=el.textContent;else if(/^Garrafas/.test(g))out.push(el.dataset.ex);}return out;});
ok(garr.length===4&&garr.every(id=>/garraf/.test(id)),'grupo Garrafas: '+garr.join(','));
await p.screenshot({path:'shots/lupa_objetos.png'});
// músculos
await p.evaluate(()=>document.querySelector('#qModo [data-v="musculos"]').click());await sleep(300);e=await estado();
ok(e.grupos.includes('Abdômen')&&e.grupos.includes('Glúteo e quadril')&&e.ids.length===0&&e.n>30,'músculos agrupados pelas mesmas partes: '+e.grupos.join(' | '));
// tocar num exercício abre a prévia; "Começar" fecha a lupa e seleciona
await p.evaluate(()=>{document.querySelector('#qModo [data-v="corpo"]').click();});await sleep(200);
await p.evaluate(()=>document.querySelector('#list .liEx[data-ex="afundo"]').click());await sleep(600);
ok(await p.evaluate(()=>!document.getElementById('pvSheet').hidden&&/Afundo/.test(document.getElementById('pvNome').textContent)),'tocar num exercício abre a prévia animada');
await p.evaluate(()=>document.getElementById('bPvFazer').click());await sleep(400);
ok(await p.evaluate(()=>document.getElementById('sheet').hidden&&__corpo.atual()==='afundo'),'"Começar exercício" fecha a lupa e seleciona o exercício');
ok(errs.length===0,'sem erros '+errs.join('|'));await b.close();})();
