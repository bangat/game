'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),site=path.dirname(root),Data=require('../shared/data.js');
(async()=>{
 const server=http.createServer((request,response)=>{
  const file=path.resolve(site,'.'+decodeURIComponent(new URL(request.url,'http://localhost').pathname));
  if(!file.startsWith(site+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){response.writeHead(404).end();return;}
  response.writeHead(200,{'content-type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':'application/octet-stream'});fs.createReadStream(file).pipe(response);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:512,height:512}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const creature of Data.species.filter(c=>c.category==='공룡')){
   await page.goto('http://127.0.0.1:'+server.address().port+'/insect_expedition/tests/model-thumbnail.html?kind=creature&id='+creature.id);
   await page.waitForFunction(()=>window.thumbnailReady);await page.waitForTimeout(200);await page.screenshot({path:path.join(root,'assets/creatures',creature.id+'.png')});
  }
  if(errors.length)throw Error(errors.join('\n'));console.log('공룡 6종 실제 3D 모델 썸네일 생성 완료');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
