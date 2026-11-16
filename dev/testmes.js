// v2.36.0: histórico com seletor de mês/ano (só meses com registro); lista segue o período; linhas suaves e marcadores ocos
const puppeteer=require('puppeteer-core');const path=require('path');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const cl=async s=>{await p.evaluate(s=>document.querySelector(s).click(),s);await sleep(250);};
const carregar=async()=>{await p.waitForFunction('window.__corpo',{timeout:60000});await sleep(300);};
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await carregar();
await p.evaluate(()=>{
  localStorage.clear();
  const ds=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const h=new Date(), lista=[];let id=0;
  const add=(d,n)=>{for(let i=0;i<n;i++){const t=d.getTime()+i*600000;lista.push({id:'r'+(id++),ex:'rosca',nome:'Rosca direta',treino:null,dia:ds(d),inicio:t,fim:t+120000,ativoSeg:120,ciclos:2,reps:10,descanso:30,descansoSeg:30});}};
  add(new Date(h.getFullYear(),h.getMonth(),h.getDate(),9),2);            // hoje
  add(new Date(h.getFullYear(),h.getMonth(),h.getDate()-3,9),1);          // há 3 dias
  add(new Date(h.getFullYear(),h.getMonth()-1,5,9),3);                    // mês passado, dia 5
  add(new Date(h.getFullYear(),h.getMonth()-1,20,9),1);                   // mês passado, dia 20
  add(new Date(h.getFullYear(),h.getMonth()-3,12,9),2);                   // três meses atrás
  localStorage.setItem('anatomotion.historico.v1@p1',JSON.stringify({v:1,lista}));
  localStorage.setItem('anatomotion.corpo.v1@p1',JSON.stringify({v:1,medidas:{peso:[{d:'2026-10-01',v:80,t:1},{d:'2026-10-15',v:79.2,t:2},{d:'2026-11-01',v:78.6,t:3},{d:'2026-11-10',v:79,t:4}]}}));
});
await p.reload();await carregar();
await cl('#bPerfil');await p.evaluate(()=>document.querySelectorAll('#pfList .pfr.clic')[0].click());await sleep(250);
await p.evaluate(()=>document.getElementById('bPfExercicios').click());await sleep(300);
const mesStr=k=>{const h=new Date();const d=new Date(h.getFullYear(),h.getMonth()-k,1);return String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();};
let s=await p.evaluate(()=>({ops:[...document.querySelectorAll('#histMes option')].map(o=>o.textContent),val:document.getElementById('histMes').value,on:document.querySelector('#histDias .on')?.dataset.v,
  barras:document.querySelectorAll('#grafHist .gGrupo').length,eixo:document.querySelectorAll('#grafHist rect.gToque').length,dias:[...document.querySelectorAll('.histDia .histData')].length}));
ok(s.ops.join()===['Mês',mesStr(0),mesStr(1),mesStr(3)].join(),'meses só os que têm registro, do mais novo ao mais velho: '+s.ops.join(' | '));
ok(s.val===''&&s.on==='14'&&s.eixo===14,'padrão: últimos 14 dias');
ok(s.dias===2,'lista só com os dias do período (hoje e há 3 dias), sem os meses anteriores: '+s.dias);
await p.screenshot({path:'shots/mes_14.png'});
// escolhe o mês passado
await p.evaluate(v=>{const s=document.getElementById('histMes');s.value=v;s.dispatchEvent(new Event('change'));},(()=>{const h=new Date();const d=new Date(h.getFullYear(),h.getMonth()-1,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');})());await sleep(300);
s=await p.evaluate(()=>({val:document.getElementById('histMes').value,cls:document.getElementById('histMes').className,on:document.querySelectorAll('#histDias .on').length,eixo:document.querySelectorAll('#grafHist rect.gToque').length,
  dias:[...document.querySelectorAll('.histDia .histData')].map(e=>e.textContent),ex:document.querySelector('.pfDados b').textContent,rot:[...document.querySelectorAll('#grafHist text.gEixo')].map(t=>t.textContent).filter(t=>/\//.test(t))}));
const h=new Date(),ultDia=new Date(h.getFullYear(),h.getMonth(),0).getDate();
ok(s.cls.includes('on')&&s.on===0&&s.eixo===ultDia,'mês escolhido: gráfico com todos os '+ultDia+' dias do mês, botões de dias desmarcados');
ok(s.dias.length===2&&/20\//.test(s.dias[0])&&/05\//.test(s.dias[1])&&s.ex==='4','lista e números só daquele mês '+JSON.stringify(s.dias)+' ex='+s.ex);
await p.screenshot({path:'shots/mes_escolhido.png'});
// voltar para 7 dias
await cl('#histDias [data-v="7"]');
s=await p.evaluate(()=>({val:document.getElementById('histMes').value,on:document.querySelector('#histDias .on')?.dataset.v,eixo:document.querySelectorAll('#grafHist rect.gToque').length}));
ok(s.val===''&&s.on==='7'&&s.eixo===7,'7 dias limpa o mês');
// três meses atrás: tocar numa barra filtra o dia dentro do mês
await p.evaluate(v=>{const s=document.getElementById('histMes');s.value=v;s.dispatchEvent(new Event('change'));},(()=>{const h=new Date();const d=new Date(h.getFullYear(),h.getMonth()-3,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');})());await sleep(300);
await p.evaluate(()=>document.querySelectorAll('#grafHist rect.gToque')[11].dispatchEvent(new MouseEvent('click',{bubbles:true})));await sleep(300);
s=await p.evaluate(()=>({filtro:document.getElementById('histFiltro')?.textContent,dias:document.querySelectorAll('.histDia').length,mes:document.getElementById('histMes').value}));
ok(/12\//.test(s.filtro||'')&&s.dias===1&&s.mes!=='','tocar na barra do dia 12 filtra aquele dia, mantendo o mês');
// gráfico de linha: curva suave e marcadores ocos
await cl('#bPfVoltar');
await p.evaluate(()=>document.getElementById('bPfMedidas').click());await sleep(300);
s=await p.evaluate(()=>{const l=document.querySelector('#grafPeso path.gLinha');const c=document.querySelector('#grafPeso circle.gPonto');const cs=getComputedStyle(c);return {d:l&&l.getAttribute('d'),pts:document.querySelectorAll('#grafPeso circle.gPonto').length,fill:cs.fill,stroke:cs.stroke,card:getComputedStyle(document.body).getPropertyValue('--card').trim()};});
ok(s.d&&/C/.test(s.d)&&s.pts===4,'linha do peso é curva (C) com 4 marcadores');
ok(s.stroke==='rgb(157, 95, 224)'&&s.fill!==s.stroke,'marcador oco: borda da cor da linha, miolo da cor do fundo '+s.fill+' / '+s.stroke);
await p.screenshot({path:'shots/linha_suave.png'});
console.log('erros',errs);if(errs.length)process.exitCode=1;await b.close();})().catch(e=>{console.error('EXC',e);process.exit(1);});
