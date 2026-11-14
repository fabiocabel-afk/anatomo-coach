// Exercícios de um lado só: depois das repetições, anuncia o outro lado, "Começa!" e conta de novo (espelhado)
const puppeteer=require('puppeteer-core');const path=require('path');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
await p.evaluateOnNewDocument(`window.__semPreparo=true;window.__autoResposta="sim";window.__falas=[];
  try{localStorage.setItem('corpo3d.treino.v1@p1',JSON.stringify({reps:3,ciclos:2,descanso:5,voz:true,ritmo:0.5,caneleira:1}));}catch(e){}
  const sp=window.speechSynthesis;if(sp){sp.speak=function(u){window.__falas.push(u.text);setTimeout(()=>{try{u.dispatchEvent(new Event('end'))}catch(e){}},5);};}`);
await p.setViewport({width:390,height:844});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const st=()=>p.evaluate(()=>({e:__corpo.treino().estado,rep:__corpo.treino().rep,ciclo:__corpo.treino().ciclo,l2:__corpo.lado2(),esp:__corpo.espelhado(),sub:document.getElementById('nSub').textContent,falas:window.__falas.slice()}));
const lista=await p.evaluate(()=>__corpo.doisLados());ok(lista.length===10,'exercícios de um lado só marcados: '+lista.join(', '));
await p.evaluate(()=>__corpo.setExercise('ostra'));await sleep(300);
ok(await p.evaluate(()=>{document.getElementById('bInfo').click();const t=document.getElementById('infoSheet').innerText;document.getElementById('infoSheet').hidden=true;return /Um lado, depois o outro/.test(t);}),'ficha mostra "Um lado, depois o outro"');
await p.screenshot({path:'shots/lado1.png'});
await p.evaluate(()=>document.getElementById('bPlay').click());await sleep(300);
let s=await st();ok(s.e==='treino'&&!s.l2&&/1º lado/.test(s.sub)&&s.falas.some(f=>/3 repetições de cada lado/.test(f)),'começa no 1º lado e avisa "de cada lado": '+s.sub);
await p.evaluate(()=>{for(let i=0;i<2000&&!__corpo.lado2();i++)__corpo.avancar(0.05);});
s=await st();
ok(s.l2&&s.e==='treino'&&s.rep===0&&s.ciclo===1&&s.esp,'depois de 3 reps: 2º lado, contagem zerada, mesmo ciclo, corpo espelhado');
ok(s.falas.some(f=>/^3\. Agora o outro lado\. Começa!$/.test(f)),'voz: "3. Agora o outro lado." e "Começa!" — '+s.falas.slice(-2).join(' / '));
ok(/2º lado/.test(s.sub),'painel mostra 2º lado: '+s.sub);
await sleep(400);await p.screenshot({path:'shots/lado2.png'});
await p.evaluate(()=>{for(let i=0;i<2000&&__corpo.treino().estado==='treino';i++)__corpo.avancar(0.05);});
s=await st();ok((s.e==='descanso'||s.e==='concluindo')&&s.falas.some(f=>/Ciclo 1 concluído/.test(f)),'depois do 2º lado: ciclo 1 concluído → descanso');
await p.evaluate(()=>{for(let i=0;i<2000&&__corpo.treino().estado!=='descanso';i++)__corpo.avancar(0.05);});
s=await st();ok(s.e==='descanso'&&!s.esp,'no descanso o corpo não fica espelhado');
await p.evaluate(()=>{for(let i=0;i<2000&&__corpo.treino().estado==='descanso';i++)__corpo.avancar(0.05);});
s=await st();ok(s.e==='treino'&&s.ciclo===2&&!s.l2&&!s.esp,'ciclo 2 recomeça pelo 1º lado');
await p.evaluate(()=>{for(let i=0;i<4000&&!['fim','pergunta'].includes(__corpo.treino().estado);i++)__corpo.avancar(0.05);});await sleep(600);
s=await st();const nOutro=s.falas.filter(f=>/Agora o outro lado/.test(f)).length;
ok(s.e==='fim'&&nOutro===2,'fim: troca de lado nos 2 ciclos ('+nOutro+')');
await p.evaluate(()=>document.getElementById('bConcSim').click());await sleep(400);const h=await p.evaluate(()=>__corpo.historico().slice(-1)[0]);ok(h&&h.ex==='ostra'&&h.lados===2&&h.ciclos===2&&h.reps===3,'histórico: 1 registro com os dois lados '+JSON.stringify(h&&{lados:h.lados,ciclos:h.ciclos,reps:h.reps}));
// exercício normal não troca de lado
await p.evaluate(()=>{__corpo.setExercise('agachamento');document.getElementById('bPlay').click();for(let i=0;i<400;i++){__corpo.avancar(0.05);if(__corpo.lado2())break;}});
s=await st();ok(!s.l2&&!s.esp&&!/lado/.test(s.sub),'exercício comum: sem troca de lado');
// duração estimada considera os dois lados
ok(errs.length===0,'sem erros '+errs.join('|'));
await b.close();})();
