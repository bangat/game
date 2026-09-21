(function(global){
 'use strict';
 let state=null,received=0;
 const overlay=document.createElement('div');overlay.className='ix-zombie-tint';overlay.setAttribute('aria-hidden','true');overlay.hidden=true;
 const notice=document.createElement('div');notice.className='ix-zombie-notice';notice.hidden=true;
 const title=document.createElement('strong'),detail=document.createElement('span');notice.append(title,detail);title.setAttribute('role','status');document.body.append(overlay,notice);
 function render(){
  if(!state)return;const now=state.serverTime+performance.now()-received,seconds=Math.max(0,Math.ceil(((state.profile.movementLockedUntil||0)-now)/1000));
  const danger=!state.battle&&(state.zombies||[]).some(z=>z.available&&z.targetUid===state.you&&z.mode==='chase');
  const visible=!document.body.classList.contains('is-customizing');overlay.hidden=!visible||!danger;notice.hidden=!visible||(!danger&&!seconds)||!!state.battle;
  const heading=seconds?'좀비에게 패배했어요':'! 좀비가 쫓아옵니다';if(title.textContent!==heading)title.textContent=heading;
  detail.textContent=seconds?'이동 가능까지 '+seconds+'초 · 잠시 회복 중입니다':'거리를 벌리세요. 붙잡히면 전투가 시작됩니다.';
  notice.classList.toggle('is-recovering',seconds>0);
 }
 const timer=setInterval(render,100);global.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
 global.InsectZombieUI={setState(next){state=next;received=performance.now();render();}};
})(window);
