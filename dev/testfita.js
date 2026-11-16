// v2.35.0: medidas do corpo com fita (circunferências), lado direito/esquerdo/os dois, desenho, gráfico e tabela
const puppeteer=require('puppeteer-core');const path=require('path');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const cl=async s=>{await p.evaluate(s=>document.querySelector(s).click(),s);await sleep(250);};
const carregar=async()=>{await p.waitForFunction('window.__corpo',{timeout:60000});await sleep(300);};
const corpo=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('anatomotion.corpo.v1@p1')||'{}'));
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await carregar();
await p.evaluate(()=>{localStorage.clear();localStorage.setItem('anatomotion.corpo.v1@p1',JSON.stringify({v:1,sexo:'M',altura:178,medidas:{peso:[{d:'2026-11-01',v:80,t:1}]}}));});
await p.reload();await carregar();
// abre Perfil → ver → Ver medidas → aba Medidas do corpo
await cl('#bPerfil');await p.evaluate(()=>document.querySelectorAll('#pfList .pfr.clic')[0].click());await sleep(250);
await p.evaluate(()=>document.getElementById('bPfMedidas').click());await sleep(300);
let s=await p.evaluate(()=>({abas:[...document.querySelectorAll('#pfMedAba button')].map(b=>b.textContent+(b.classList.contains('on')?'*':'')).join(),graf:!!document.getElementById('grafPeso')}));
ok(s.abas==='Peso*,Medidas do corpo'&&s.graf,'abas Peso / Medidas do corpo; o peso continua igual '+s.abas);
await cl('#pfMedAba button[data-v=fita]');
s=await p.evaluate(()=>({lado:[...document.querySelectorAll('#pfLado button')].map(b=>b.textContent+(b.classList.contains('on')?'*':'')).join(),
  marcas:[...document.querySelectorAll('.figMed .fmMarca')].map(g=>g.dataset.k),lista:[...document.querySelectorAll('#fitaLista .fitaLin')].length,
  braco:[...document.querySelectorAll('.figMed .fmMarca')].filter(g=>g.dataset.k==='braco').map(g=>g.getAttribute('aria-label'))}));
ok(s.lado==='Direito*,Esquerdo,Os dois','padrão: lado direito '+s.lado);
ok(s.marcas.length===12&&s.lista===12&&s.braco.join()==='Braço direito','desenho com 12 pontos (só o lado direito) e lista com 12 medidas');
// o lado direito da pessoa fica à esquerda de quem olha
s=await p.evaluate(()=>{const g=[...document.querySelectorAll('.figMed .fmMarca')].find(g=>g.dataset.k==='coxa');return Number(g.querySelector('circle').getAttribute('cx'));});
ok(s<354,'marca da coxa direita à esquerda do desenho (de frente) cx='+s);
await p.screenshot({path:'shots/fita_tela.png',fullPage:false});
// registrar: só direito
await cl('#bFitaMedir');
s=await p.evaluate(()=>({form:!!document.getElementById('pfMedir'),campos:[...document.querySelectorAll('#pfMedir input.inp:not([type=date])')].map(i=>i.id)}));
ok(s.form&&s.campos.length===12&&s.campos.includes('md_braco_d')&&!s.campos.includes('md_braco_e'),'formulário com 12 campos (braço só direito)');
await p.evaluate(()=>{document.getElementById('pfMedirDia').value='2026-11-02';document.getElementById('pfMedirDia').dispatchEvent(new Event('change'));});
const digitar=async(id,v)=>{await p.evaluate((id,v)=>{const i=document.getElementById(id);i.value=v;i.dispatchEvent(new Event('input'));},id,v);};
await digitar('md_cintura','85,5');await digitar('md_braco_d','36');await digitar('md_punho_d','99');
await p.evaluate(()=>[...document.querySelectorAll('#pfMedir button')].find(b=>b.textContent==='Salvar medidas').click());await sleep(250);
s=await p.evaluate(()=>({msg:document.getElementById('pfMsg').textContent,form:!!document.getElementById('pfMedir')}));
ok(s.form&&/punho \(direito\).*entre 10 e 30/.test(s.msg),'valor fora da faixa: avisa e não grava: '+s.msg);
ok(!(await corpo()).medidas.cintura,'nada gravado com erro');
await digitar('md_punho_d','17');
await p.evaluate(()=>[...document.querySelectorAll('#pfMedir button')].find(b=>b.textContent==='Salvar medidas').click());await sleep(300);
let c=await corpo();
s=await p.evaluate(()=>document.getElementById('pfMsg').textContent);
ok(c.medidas.cintura[0].v===85.5&&c.medidas.cintura[0].d==='2026-11-02'&&c.medidas.braco_d[0].v===36&&c.medidas.punho_d[0].v===17&&!c.medidas.braco_e&&c.medidas.peso.length===1&&c.sexo==='M'&&/3 medidas/.test(s),'gravou 3 medidas no dia certo, sem mexer no resto: '+s);
// segunda data
await cl('#bFitaMedir');await digitar('md_cintura','84');await digitar('md_braco_d','36,8');
await p.evaluate(()=>[...document.querySelectorAll('#pfMedir button')].find(b=>b.textContent==='Salvar medidas').click());await sleep(300);
s=await p.evaluate(()=>{const l=document.querySelector('#fitaLista [data-k=cintura] .fitaVal').textContent;const br=document.querySelector('#fitaLista [data-k=braco] .fitaVal').textContent;return {l,br};});
ok(/84 cm.*−1,5/.test(s.l)&&/D 36,8 cm.*\+0,8/.test(s.br),'lista mostra atual e variação: '+JSON.stringify(s));
// trocar para os dois lados
await cl('#pfLado button[data-v=A]');
c=await corpo();
s=await p.evaluate(()=>({marcas:[...document.querySelectorAll('.figMed .fmMarca')].length,br:document.querySelector('#fitaLista [data-k=braco] .fitaVal').textContent}));
ok(c.lado==='A'&&s.marcas===18&&/D 36,8.*E —/.test(s.br),'os dois lados: grava no perfil, 18 pontos no desenho '+JSON.stringify(s));
await cl('#bFitaMedir');
s=await p.evaluate(()=>[...document.querySelectorAll('#pfMedir input.inp:not([type=date])')].length);
ok(s===18,'formulário com direito e esquerdo nos membros (18 campos)');
await digitar('md_braco_e','35,9');await digitar('md_coxa_d','58');await digitar('md_coxa_e','57,5');
await p.evaluate(()=>[...document.querySelectorAll('#pfMedir button')].find(b=>b.textContent==='Salvar medidas').click());await sleep(300);
await p.screenshot({path:'shots/fita_lista.png',fullPage:false});
// detalhe do braço pelo desenho
await p.evaluate(()=>[...document.querySelectorAll('.figMed .fmMarca')].find(g=>g.dataset.k==='braco').dispatchEvent(new MouseEvent('click',{bubbles:true})));await sleep(300);
s=await p.evaluate(()=>({cab:document.querySelector('.fitaCab b').textContent+' · '+(document.querySelector('.fitaCabLado')?.textContent||'').toLowerCase(),dados:[...document.querySelectorAll('.pfDados>div')].map(d=>d.textContent),
  linhas:document.querySelectorAll('#grafFita svg.graf path.gLinha').length,linhas2:document.querySelectorAll('#grafFita svg.graf path.gLinha2').length,leg:document.querySelector('#grafFita .gLeg')?.textContent,
  th:[...document.querySelectorAll('#fitaTab th')].map(t=>t.textContent).join(),rows:document.querySelectorAll('#fitaTab tbody tr').length}));
ok(/Braço · os dois/.test(s.cab)&&s.linhas===1&&s.linhas2===1&&s.leg==='DireitoEsquerdo'&&s.th==='Data,Direito,Esquerdo,'&&s.rows===2,'detalhe: gráfico com 2 linhas + legenda e tabela D/E '+JSON.stringify(s));
await p.screenshot({path:'shots/fita_detalhe.png',fullPage:false});
// voltar volta para a lista da fita
await cl('#bPfVoltar');
ok(await p.evaluate(()=>!!document.getElementById('fitaLista')&&document.querySelector('#pfMedAba .on').dataset.v==='fita'),'voltar do detalhe → lista da fita');
// apagar uma data da cintura
await p.evaluate(()=>document.querySelector('#fitaLista [data-k=cintura]').click());await sleep(300);
const hoje=await p.evaluate(()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');});
await p.evaluate(()=>document.querySelector('#fitaTab tbody tr button').click());await sleep(200);
await p.evaluate(()=>document.querySelector('#fitaTab tbody tr button').click());await sleep(300);
c=await corpo();
ok(c.medidas.cintura.length===1&&c.medidas.cintura[0].d==='2026-11-02','apagar (com confirmação) tira só aquela data');
// esquerdo apenas
await cl('#bPfVoltar');await cl('#pfLado button[data-v=E]');
s=await p.evaluate(()=>({k:[...document.querySelectorAll('.figMed .fmMarca')].filter(g=>g.dataset.k==='braco').map(g=>g.getAttribute('aria-label')).join(),cx:Number([...document.querySelectorAll('.figMed .fmMarca')].find(g=>g.dataset.k==='coxa').querySelector('circle').getAttribute('cx')),br:document.querySelector('#fitaLista [data-k=braco] .fitaVal').textContent}));
ok(s.k==='Braço esquerdo'&&s.cx>354&&/E 35,9/.test(s.br),'só esquerdo: marcas do outro lado e valores do esquerdo '+JSON.stringify(s));
// botão + abre o formulário da fita na aba fita
await cl('#bPfAdd');ok(await p.evaluate(()=>!!document.getElementById('pfMedir')),'+ abre o registro da fita');
await cl('#bPfAdd');
// tema claro
await p.evaluate(()=>document.body.classList.add('claro'));await cl('#pfLado button[data-v=A]');
await p.screenshot({path:'shots/fita_claro.png',fullPage:false});
// backup leva as medidas
s=await p.evaluate(async()=>JSON.stringify(await __corpo.backup.montar()));
console.log(s.slice(0,400));ok(/braco_e/.test(s)&&/lado/.test(s),'backup inclui as medidas da fita e o lado');
console.log('erros',errs);if(errs.length)process.exitCode=1;await b.close();})().catch(e=>{console.error('EXC',e);process.exit(1);});
