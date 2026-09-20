'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const site=path.resolve(__dirname,'../..');
 const lobby=fs.readFileSync(path.join(site,'대기실.html'),'utf8');
 const registration=lobby.slice(lobby.indexOf('const availableGames = ['));
 const files=[...registration.slice(0,registration.indexOf('];')).matchAll(/file:\s*'([^']+)'/g)].map(x=>x[1]);
 assert(files.length>=19);
 for(const file of files){const response=await fetch('http://127.0.0.1:4193/'+encodeURI(file));assert.equal(response.status,200,file);assert.match(await response.text(),/<html/i,file);}
 for(const file of ['index.html','대기실.html','게임방.html','sw.js']){const bytes=fs.readFileSync(path.join(site,file));const value=new TextDecoder('utf-8',{fatal:true}).decode(bytes);assert(!value.includes('\uFFFD'),file);}
 console.log(`통과: 기존 메뉴 ${files.length}개 게임 진입 문서 HTTP 200, 통합 HTML·서비스워커 UTF-8. 개별 게임 전체 플레이 회귀 시험은 별도.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
