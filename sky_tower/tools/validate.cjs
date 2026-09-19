const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const files = ['index.html','styles.css','main.js','characters.js','audio.js','world.js','game.js','protocol.js','network.js','ui.js','database.rules.json','vendor/babylon-9.27.1.js','vendor/BABYLON-LICENSE.md'];
const manifest = { configuration: 'Release', assets: {} };
for (const file of files) {
  const bytes = fs.readFileSync(path.join(root,file));
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (!file.startsWith('vendor/') && (bytes.subarray(0,3).equals(Buffer.from([239,187,191])) || text.includes('\uFFFD'))) throw new Error('인코딩 확인 필요: ' + file);
  if (file.endsWith('.js')) new vm.Script(text, { filename:file });
  if (file.endsWith('.json')) JSON.parse(text);
  manifest.assets[file] = { bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
}
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
for (const match of html.matchAll(/(?:src|href)="([^"#?]+)"/g)) {
  if (/^(https?:|data:)/.test(match[1])) continue;
  if (!fs.existsSync(path.resolve(root,match[1]))) throw new Error('누락된 자원: ' + match[1]);
}
const characterContext = { window: {}, localStorage: { getItem: () => null } };
vm.runInNewContext(fs.readFileSync(path.join(root, 'characters.js'), 'utf8'), characterContext);
const characterAssets = new Set();
for (const character of characterContext.window.SkyTowerCharacters.list) {
  for (const asset of Object.values(character.frames)) characterAssets.add(asset);
}
for (const avatar of ['default_bomber', 'penguin_parka', 'puppy_set']) {
  characterAssets.add(characterContext.window.SkyTowerCharacters.resolveLegacyAvatar(avatar));
}
for (const asset of characterAssets) {
  const file = path.resolve(root, asset);
  if (!fs.existsSync(file)) throw new Error('캐릭터 자원 누락: ' + asset);
  const bytes = fs.readFileSync(file);
  manifest.assets[asset] = { bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
}
for (const name of ['게임방.html','대기실.html']) {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(path.join(root,'..',name)));
  if (!text.includes("id: 'skyTower'") || !text.includes("file: 'sky_tower/index.html'")) throw new Error('메뉴 연결 누락: ' + name);
  for (const match of text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) if (match[1].trim()) new vm.Script(match[1],{filename:name});
}
new vm.Script(fs.readFileSync(path.join(root, '..', 'sw.js'), 'utf8'), { filename: 'sw.js' });
fs.writeFileSync(path.join(root,'release-manifest.json'), JSON.stringify(manifest,null,2) + '\n','utf8');
console.log('Release 검증 통과: 스크립트 문법, 메뉴 연결, 정적 자원, 보안 규칙 JSON, UTF-8 및 자원 해시.');
