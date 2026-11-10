# Corpo 3D — Anatomo Coach

App (PWA) de exercícios com um corpo humano 3D próprio: esqueleto, músculos e dedos gerados por código (Three.js r128), catálogo de exercícios com ficha, treino com contagem por voz em português, treinos montados (sequências) e trilha sonora.

## Estrutura

- **Raiz** — o app pronto para publicar: `index.html` (arquivo único), `sw.js`, `manifest.json` e ícones.
- **`dev/`** — código-fonte e testes:
  - `src/template.html` — HTML e CSS
  - `src/app.js` — corpo 3D, poses, câmera, treino, treinos montados, interface
  - `src/exercicios.js` — catálogo de exercícios
  - `src/musica.js` — trilha sonora (som sintetizado e músicas do aparelho)
  - `build.js` — junta tudo em `dev/dist/` (versão do cache definida em `VERSION`)
  - `test*.js` — testes com Puppeteer

## Gerar uma versão

```bash
cd dev
npm install
node --check src/app.js && node --check src/exercicios.js && node --check src/musica.js
node build.js            # gera dev/dist/pwa/
cp dist/pwa/* ..         # atualiza o app na raiz
```

Antes de publicar, aumente `VERSION` no `build.js` para o celular baixar a versão nova.
