'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..'), site = path.dirname(root);
const files = ['index.html','game.html','landscape.js','config.js','emulator.js','main.js','audio.js','characters.js','world.js','ui.js','styles.css','shared/data.js','shared/navigation.js','shared/battle.cjs','package.json','package-lock.json','README.md','ASSET_SOURCES.md','Start-Local.ps1','Start-Firebase.ps1','firebase.emulator.json'];
for (const entry of fs.readdirSync(path.join(root, 'server'))) if (entry.endsWith('.cjs')) files.push('server/' + entry);
function assets(directory) { for (const item of fs.readdirSync(path.join(root,directory),{withFileTypes:true})) { const name=directory+'/'+item.name; if(item.isDirectory()) assets(name); else files.push(name); } }
assets('assets');
const manifest = { configuration: 'Release', game: 'insectExpedition', assets: {} };
for (const file of files) {
  const bytes = fs.readFileSync(path.join(root, file));
  if (/\.(?:html|js|cjs|css|json|md|ps1)$/.test(file)) {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (bytes.subarray(0,3).equals(Buffer.from([239,187,191])) || text.includes('\uFFFD')) throw new Error('인코딩 오류: ' + file);
    if (/\.(cjs|js)$/.test(file)) new vm.Script(text, { filename: file });
  }
  manifest.assets[file] = { bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
}
for (const file of ['index.html', '대기실.html', '게임방.html']) {
  const text = fs.readFileSync(path.join(site, file), 'utf8');
  if (!text.includes('insect_expedition/emulator.js')) throw new Error('인증 연결 누락: ' + file);
  if (file !== 'index.html' && !text.includes("id: 'insectExpedition'")) throw new Error('메뉴 연결 누락: ' + file);
  for (const script of text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) if (script[1].trim()) new vm.Script(script[1], { filename: file });
}
for (const match of (fs.readFileSync(path.join(root, 'index.html'), 'utf8') + fs.readFileSync(path.join(root, 'game.html'), 'utf8')).matchAll(/(?:src|href)="([^"?]+)"/g)) {
  if (/^https?:/.test(match[1])) continue;
  if (!fs.existsSync(path.resolve(root, match[1]))) throw new Error('자원 누락: ' + match[1]);
}
const data = require('../shared/data.js');
for (const creature of data.species) {
  if (creature.rarity === 'common' && creature.skill) throw new Error('일반종 고유스킬 오류');
  if (['rare','evolved','elite','monster'].includes(creature.rarity) && !creature.skill) throw new Error('희귀종 고유스킬 누락');
}
fs.writeFileSync(path.join(root, 'release-manifest.json'), JSON.stringify(manifest,null,2) + '\n', 'utf8');
console.log(`Release 통과: ${files.length}개 코드·자원, 메뉴/인증 연결, ${data.species.length}종 데이터, UTF-8/해시.`);
