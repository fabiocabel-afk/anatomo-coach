const puppeteer=require('puppeteer-core');
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage();
for(const s of [192,512]){await p.setViewport({width:s,height:s});
await p.setContent(`<body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 100 100"><rect width="100" height="100" fill="#642A90"/><g fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"><circle cx="50" cy="24" r="8" fill="#fff" stroke="none"/><path d="M50 34v26M50 40l-18 12M50 40l18 12M50 60l-12 22M50 60l12 22"/></g><circle cx="50" cy="47" r="5" fill="#EC357D"/></svg></body>`);
await p.screenshot({path:`dist/pwa/icon-${s}.png`,clip:{x:0,y:0,width:s,height:s}});}
await b.close();})();
