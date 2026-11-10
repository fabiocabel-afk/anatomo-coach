const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome', headless: 'new',
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  const file = process.argv[2] || 'dist/corpo3d.html';
  await page.goto('file://' + path.resolve(file));
  await page.waitForFunction('window.__corpo', { timeout: 20000 });
  await new Promise(r => setTimeout(r, 800));
  fs.mkdirSync('shots', { recursive: true });
  const ids = await page.evaluate(() => window.__corpo.exercicios);
  const report = [];
  const views = (process.argv[3] || 'best').split(',');
  for (const id of ids) {
    for (const p of [0, 1]) {
      await page.evaluate((id, p) => { window.__corpo.setExercise(id); window.__corpo.setPhase(p); }, id, p);
      await new Promise(r => setTimeout(r, 250));
      const m = await page.evaluate(() => window.__corpo.medir());
      report.push({ id, p, minAll: +m.minAll.toFixed(4), feet: +m.minFeet.toFixed(4), hands: +m.minHands.toFixed(4) });
      if (views.includes('best')) await page.screenshot({ path: `shots/${id}_${p}.png` });
      for (const v of views.filter(v => v !== 'best')) {
        const [th, ph, d, ty] = v.split(':').map(Number);
        await page.evaluate((a, b, c, e) => window.__corpo.setView(a, b, c, e), th, ph, d, ty);
        await new Promise(r => setTimeout(r, 150));
        await page.screenshot({ path: `shots/${id}_${p}_v${th}.png` });
      }
    }
  }
  const info = await page.evaluate(() => window.__corpo.medir());
  console.log('ossos', info.ossos, 'grupos musculares', info.musculos);
  console.table(report);
  console.log('ERROS:', errors.length ? errors : 'nenhum');
  await browser.close();
})();
