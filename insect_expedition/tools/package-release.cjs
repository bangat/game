'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),site=path.dirname(root),dist=path.join(root,'dist'),stage=path.join(dist,'insect-expedition-release');
if (!stage.startsWith(root+path.sep) || path.dirname(stage)!==dist) throw new Error('패키지 경로 오류');
fs.mkdirSync(dist,{recursive:true});
if(fs.existsSync(stage))fs.rmSync(stage,{recursive:true,force:true});
fs.mkdirSync(stage,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(path.join(root,'release-manifest.json'),'utf8'));
const entries=Object.keys(manifest.assets).concat(['release-manifest.json']);
for(const folder of ['tests','tools'])for(const name of fs.readdirSync(path.join(root,folder)))if(/\.(cjs|html|json)$/.test(name))entries.push(folder+'/'+name);
for(const optional of ['model-gallery.png','VERIFICATION.md'])if(fs.existsSync(path.join(root,optional)))entries.push(optional);
function copy(source,relative){const target=path.join(stage,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);}
for(const file of entries)copy(path.join(root,file),'insect_expedition/'+file);
for(const file of ['index.html','대기실.html','게임방.html','sw.js','sky_tower/vendor/babylon-9.27.1.js','sky_tower/vendor/BABYLON-LICENSE.md'])copy(path.join(site,file),file);
const hashes={};
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else hashes[path.relative(stage,file).replaceAll('\\','/')]=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}}
walk(stage);fs.writeFileSync(path.join(stage,'SHA256SUMS.json'),JSON.stringify(hashes,null,2)+'\n','utf8');
const zip=path.join(dist,'insect-expedition-local-release.zip');
const quote=value=>"'"+value.replaceAll("'","''")+"'";
const script=`$ErrorActionPreference='Stop'; Compress-Archive -Path ${quote(stage+'\\*')} -DestinationPath ${quote(zip)} -Force`;
const result=spawnSync('powershell.exe',['-NoProfile','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{encoding:'utf8'});
if(result.status!==0)throw new Error(result.stderr||result.stdout);
if(!fs.statSync(zip).size)throw new Error('빈 패키지');
const verified=path.join(dist,'verify-'+Date.now());
if(path.dirname(verified)!==dist)throw new Error('검증 경로 오류');
const expand=`$ErrorActionPreference='Stop'; Expand-Archive -LiteralPath ${quote(zip)} -DestinationPath ${quote(verified)}`;
const extracted=spawnSync('powershell.exe',['-NoProfile','-EncodedCommand',Buffer.from(expand,'utf16le').toString('base64')],{encoding:'utf8'});
if(extracted.status!==0)throw new Error(extracted.stderr||extracted.stdout);
for(const [file,hash] of Object.entries(hashes)){
 const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(verified,file))).digest('hex');
 if(actual!==hash)throw new Error('압축본 해시 불일치: '+file);
}
fs.rmSync(verified,{recursive:true,force:true});
console.log('검증용 통합 패키지: '+zip+' / '+Object.keys(hashes).length+'개 파일');
