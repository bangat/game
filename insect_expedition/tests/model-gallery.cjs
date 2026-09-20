const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const server = http.createServer((request, response) => {
    const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/+/, '');
    const file = path.resolve(projectRoot, relative);
    if (!file.startsWith(projectRoot + path.sep) || !fs.existsSync(file)) { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'content-type': path.extname(file) === '.html' ? 'text/html; charset=utf-8' : path.extname(file) === '.js' ? 'text/javascript; charset=utf-8' : 'application/octet-stream' });
    fs.createReadStream(file).pipe(response);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/insect_expedition/tests/model-gallery.html`);
  await page.waitForFunction(() => window.galleryReady && BABYLON.Engine.LastCreatedScene.meshes.length > 25);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(projectRoot, 'insect_expedition', 'model-gallery.png') });
  await browser.close(); await new Promise((resolve) => server.close(resolve));
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('model-gallery.png 생성 완료');
})().catch((error) => { console.error(error); process.exitCode = 1; });
