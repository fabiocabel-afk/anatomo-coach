// v2.40.0: cápsulas da tela principal seguem o grupo escolhido na lista suspensa do catálogo
const puppeteer=require('puppeteer-core');const path=require('path');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const cl=async s=>{await p.evaluate(s=>document.querySelector(s).click(),s);await sleep(300);};
const carregar=async()=>{await p.waitForFunction('window.__corpo',{timeout:60000});await sleep(400);};
const chips=()=>p.evaluate(()=>({g:document.querySelector('#bGrupo span').textContent,n:document.querySelectorAll('#chips .chip:not(.grp)').length,on:document.querySelector('#chips .chip.on')?.dataset.id||null,ids:[...document.querySelectorAll('#chips .chip:not(.grp)')].map(c=>c.dataset.id)}));
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.evaluate(()=>localStorage.clear());await p.reload();await carregar();
const total=await p.evaluate(()=>__corpo.exercicios.length);
let s=await chips();console.log('início',s.g,s.n,s.on);
const escolher=async k=>{await cl('#bGrupo');await cl('#exGrupoBtn');await p.evaluate(k=>{const o=[...document.querySelectorAll('#exGrupoMenu .ddOp')].find(b=>b.querySelector('.ddTx').textContent===k.t&&(k.eq?b.classList.contains('eq'):k.raiz?b.classList.contains('raiz'):!b.classList.contains('eq')&&!b.classList.contains('raiz'))&&(!k.idx||true));o.click();},k);await sleep(300);await cl('#bExClose');};
await escolher({t:'Todos os grupos',raiz:true});
s=await chips();ok(s.g==='Todos os grupos'&&s.n===total,'Todos os grupos: '+s.n+' cápsulas (todos os exercícios)');
await escolher({t:'Halteres',eq:true});
s=await chips();const nHal=await p.evaluate(()=>__corpo.exercicios.filter(id=>{return true}).length);
const hal=await p.evaluate(()=>[...document.querySelectorAll('#chips .chip:not(.grp)')].length);
ok(s.g==='Halteres'&&s.n<total&&s.n>5,'Halteres: só os de halteres ('+s.n+')');
// Halteres · Superior (a primeira região de halteres na lista)
await cl('#bGrupo');await cl('#exGrupoBtn');
await p.evaluate(()=>{const ops=[...document.querySelectorAll('#exGrupoMenu .ddOp')];const i=ops.findIndex(b=>b.classList.contains('eq')&&b.querySelector('.ddTx').textContent==='Halteres');ops[i+1].click();});await sleep(300);await cl('#bExClose');
s=await chips();ok(/^Halteres · /.test(s.g)&&s.n>0&&s.n<hal,'Halteres · região: só aquele grupo: '+s.g+' ('+s.n+')');
// escolher um exercício pela cápsula mantém o grupo
await p.evaluate(()=>document.querySelectorAll('#chips .chip:not(.grp)')[1].click());await sleep(400);
const s2=await chips();ok(s2.g===s.g&&s2.on===s.ids[1],'tocar numa cápsula escolhe o exercício e mantém o grupo');
// exercício de outro grupo (ex.: veio de um treino): cápsulas mostram o grupo dele, sem mudar a escolha do catálogo
const catAntes=await p.evaluate(()=>__corpo.catalogo2().grupo);
await p.evaluate(()=>__corpo.setExercise('agachamento'));await sleep(400);
s=await chips();const cat=await p.evaluate(()=>__corpo.catalogo2().grupo);
ok(s.on==='agachamento'&&!/^Halteres · Superior$/.test(s.g)&&cat===catAntes,'exercício de fora: mostra o grupo dele ('+s.g+'), catálogo continua '+cat);
// Todos os grupos contém tudo: não troca
await escolher({t:'Todos os grupos',raiz:true});await p.evaluate(()=>__corpo.setExercise('rosca'));await sleep(300);
s=await chips();ok(s.g==='Todos os grupos'&&s.on==='rosca','em "Todos os grupos" continua todos e marca a cápsula do exercício');
// favoritos
await cl('#bGrupo');await p.evaluate(()=>{for(const id of ['rosca','prancha']){const li=document.querySelector('#exList [data-id="'+id+'"] .fav');if(li)li.click();}});await sleep(200);
await cl('#bSoFav');await cl('#bExClose');
s=await chips();ok(s.g==='Favoritos'&&s.ids.sort().join()==='prancha,rosca','só favoritos: cápsulas com os favoritos '+s.ids.join());
// guarda a escolha ao recarregar
await cl('#bGrupo');await cl('#bSoFav');await cl('#exGrupoBtn');await p.evaluate(()=>[...document.querySelectorAll('#exGrupoMenu .ddOp.eq')].find(b=>b.querySelector('.ddTx').textContent==='Barra').click());await sleep(300);await cl('#bExClose');
await p.evaluate(()=>__corpo.setExercise('repouso'));await sleep(200);
await p.reload();await carregar();
s=await chips();ok(s.g==='Barra','depois de recarregar continua o grupo escolhido: '+s.g);
await p.screenshot({path:'shots/chips.png'});
console.log('erros',errs);if(errs.length)process.exitCode=1;await b.close();})().catch(e=>{console.error('EXC',e);process.exit(1);});
