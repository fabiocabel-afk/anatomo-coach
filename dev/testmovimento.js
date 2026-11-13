// Movimento natural: pequeno, pés no chão, barra não atravessa, apoios no chão não escorregam, estático = igual a antes
const puppeteer=require('puppeteer-core');const path=require('path');
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve('dist/corpo3d.html'));await p.waitForFunction('window.__corpo',{timeout:60000});
const ok=(c,m)=>{console.log((c?'OK  ':'FALHA ')+m);if(!c)process.exitCode=1;};
const r=await p.evaluate(()=>{
  const C=__corpo,TT=[0,0.9,1.8,2.7,3.6,4.5,5.4,6.3];
  const cat=C.catalogo();const res={maxGrau:0,maxGrauEx:'',pesY:0,pesYEx:'',pesZ:0,pesZEx:'',barra:[],chao:0,chaoEx:'',estatico:0,perfis:{}};
  const dif=(a,b)=>{let m=0;for(const k in a)for(let i=0;i<3;i++)m=Math.max(m,Math.abs(a[k][i]-b[k][i]));return m;};
  for(const c of cat){
    C.setExercise(c.id);const ex=C.exAtual();res.perfis[c.id]=C.perfilMov(c.id);
    for(const ph of [0,0.25,0.5,0.75,1]){
      C.movimento('estatico');C.posar(ph,0);const o0=C.rotOssos(),pe0=C.pesPos(),mao0=C.maosPos?C.maosPos():null;
      C.movimento('natural');
      for(const t of TT){
        C.tempoNatural(t);C.posar(ph,0);const o1=C.rotOssos(),pe1=C.pesPos();
        // só conta ossos do tronco/pernas mexidos pelo natural (braços seguem o IK)
        const sub=(o)=>{const x={};for(const k of ['spine','chest','upperChest','neck','leftUpperLeg','leftLowerLeg','leftFoot','rightUpperLeg','rightLowerLeg','rightFoot'])if(o[k])x[k]=o[k];return x;};
        const g=dif(sub(o1),sub(o0));if(g>res.maxGrau){res.maxGrau=g;res.maxGrauEx=c.id+'@'+ph;}
        if(!ex.chao&&!ex.pernas){
          // pés: no chão e sem deslizar
          const minY0=Math.min(...pe0.map(v=>v[1])),minY1=Math.min(...pe1.map(v=>v[1]));
          const dy=Math.abs(minY1-minY0);if(dy>res.pesY){res.pesY=dy;res.pesYEx=c.id;}
          let dz=0;for(let i=0;i<pe0.length;i++)dz=Math.max(dz,Math.hypot(pe1[i][0]-pe0[i][0],pe1[i][2]-pe0[i][2]));if(dz>res.pesZ){res.pesZ=dz;res.pesZEx=c.id;}
        }
        if(ex.chao){let d=0;for(let i=0;i<pe0.length;i++)d=Math.max(d,Math.hypot(pe1[i][0]-pe0[i][0],pe1[i][1]-pe0[i][1],pe1[i][2]-pe0[i][2]));if(d>res.chao){res.chao=d;res.chaoEx=c.id;}}
        const x=C.barraNoCorpo();if(x&&Object.keys(x.dentro).length)res.barra.push(c.id+'@'+ph+' t'+t+' '+JSON.stringify(x.dentro));
      }
      C.tempoNatural(null);
    }
    // estático: idêntico em qualquer momento
    C.movimento('estatico');C.posar(0.5,0);const a=C.rotOssos();C.tempoNatural(3);C.posar(0.5,0);const bb=C.rotOssos();C.tempoNatural(null);res.estatico=Math.max(res.estatico,dif(a,bb));
    C.movimento('natural');
  }
  return res;});
console.log(JSON.stringify({maxGrau:r.maxGrau,ex:r.maxGrauEx,pesY:r.pesY,pesYEx:r.pesYEx,pesZ:r.pesZ,pesZEx:r.pesZEx,chao:r.chao,chaoEx:r.chaoEx,estatico:r.estatico}));
ok(r.maxGrau<=4,'movimento natural pequeno: no máximo '+r.maxGrau.toFixed(2)+'° ('+r.maxGrauEx+')');
ok(r.pesY<0.004,'pés continuam no chão (variação '+(r.pesY*1000).toFixed(1)+' mm, '+r.pesYEx+')');
ok(r.pesZ<0.02,'pés não deslizam (máx '+(r.pesZ*1000).toFixed(1)+' mm, '+r.pesZEx+')');
ok(r.chao<0.02,'exercícios no chão: apoios quase parados (máx '+(r.chao*1000).toFixed(1)+' mm, '+r.chaoEx+')');
ok(r.barra.length===0,'barra não atravessa o corpo com o movimento natural '+r.barra.slice(0,5).join(' | '));
ok(r.estatico<1e-6,'modo estático: pose idêntica, sem movimento');
// perfis de alguns exercícios
const pf=r.perfis;console.log('rosca',JSON.stringify(pf.rosca_direta||pf.rosca),'desenv',JSON.stringify(pf.desenvolvimento_barra),'lateral',JSON.stringify(pf.elevacao_lateral),'agach',JSON.stringify(pf.agachamento));
// botão em Ajustes
await p.evaluate(()=>document.getElementById('bCfg')?document.getElementById('bCfg').click():null);await new Promise(r=>setTimeout(r,400));
const ui=await p.evaluate(()=>{const s=document.getElementById('cMov');return s?[...s.children].map(x=>x.textContent+(x.classList.contains('on')?'*':'')).join(','):null;});
ok(ui==='Natural*,Estático','botão Movimento do corpo em Ajustes: '+ui);
await p.evaluate(()=>document.querySelector('#cMov [data-v="estatico"]').click());
const salvo=await p.evaluate(()=>{const k=Object.keys(localStorage).find(k=>k.startsWith('anatomotion.camera.v1'));return k&&JSON.parse(localStorage.getItem(k)).mov;});
ok(salvo==='estatico'&&await p.evaluate(()=>__corpo.movimento()==='estatico'),'escolha Estático gravada no perfil');
await p.reload();await p.waitForFunction('window.__corpo',{timeout:60000});
ok(await p.evaluate(()=>__corpo.movimento()==='estatico'),'continua Estático depois de reabrir');
await p.evaluate(()=>__corpo.movimento('natural'));
ok(errs.length===0,'sem erros '+errs.join('|'));
await b.close();})();
