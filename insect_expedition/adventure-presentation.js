(function(global){
  'use strict';
  const B=global.BABYLON;
  function create(scene){
    const live=new Set(),overlay=document.createElement('div');overlay.className='ix-scene-transition';overlay.setAttribute('aria-hidden','true');overlay.innerHTML='<div class="ix-transition-rings"></div><strong></strong><span></span>';document.body.appendChild(overlay);
    let timer;
    function transition(name,battle){
      clearTimeout(timer);overlay.classList.remove('is-active');void overlay.offsetWidth;overlay.dataset.kind=battle?'battle':'portal';overlay.querySelector('strong').textContent=battle?'전투 돌입':name;overlay.querySelector('span').textContent=battle?'탐험대, 전투 준비!':'포탈을 지나 새로운 지역으로';overlay.classList.add('is-active');document.body.classList.add('is-scene-transition');
      global.InsectAudio?.play(battle?'battle-enter':'portal');timer=setTimeout(()=>{overlay.classList.remove('is-active');document.body.classList.remove('is-scene-transition');},850);
    }
    function burst(position,color,style='burst'){
      const texture=new B.DynamicTexture('battle-particle',{width:64,height:64},scene,false),ctx=texture.getContext();ctx.clearRect(0,0,64,64);const g=ctx.createRadialGradient(32,32,0,32,32,31);g.addColorStop(0,'#fff');g.addColorStop(.2,'#fffffff5');g.addColorStop(.6,'#ffffff88');g.addColorStop(1,'#ffffff00');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);texture.update();texture.hasAlpha=true;
      const ps=new B.ParticleSystem('battle-particles-'+style,style==='charge'?75:180,scene);ps.particleTexture=texture;ps.emitter=position.clone();ps.minEmitBox=new B.Vector3(-.2,0,-.2);ps.maxEmitBox=new B.Vector3(.2,.2,.2);
      const c=B.Color3.FromHexString(color);ps.color1=new B.Color4(c.r,c.g,c.b,1);ps.color2=new B.Color4(1,1,.95,1);ps.colorDead=new B.Color4(c.r,c.g,c.b,0);
      ps.minSize=.08;ps.maxSize=style==='fire'?.72:.42;ps.minLifeTime=.22;ps.maxLifeTime=.7;ps.minEmitPower=style==='charge'?1:4;ps.maxEmitPower=style==='charge'?3:11;
      ps.direction1=new B.Vector3(-1,.3,-1);ps.direction2=new B.Vector3(1,1.5,1);ps.gravity=new B.Vector3(0,style==='fire'?2:-5,0);ps.blendMode=B.ParticleSystem.BLENDMODE_ADD;ps.updateSpeed=.016;ps.manualEmitCount=style==='charge'?55:125;ps.disposeOnStop=true;ps.targetStopDuration=.8;live.add(ps);ps.onDisposeObservable.add(()=>{live.delete(ps);texture.dispose();});ps.start();
    }
    return {transition,burst,dispose(){clearTimeout(timer);overlay.remove();document.body.classList.remove('is-scene-transition');for(const p of [...live])p.dispose();}};
  }
  global.InsectPresentation={create};
})(window);
