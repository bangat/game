(function(global){
  'use strict';
  const A=global.InsectAppearance,B=global.BABYLON;
  const escape=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const tabs=[['basic','기본'],['hair','헤어'],['face','얼굴'],['clothes','의상'],['extras','소품']];
  const labels={body:'캐릭터',build:'체형',skin:'피부색',hairStyle:'헤어 스타일',hairColor:'머리색',face:'표정',eyeColor:'눈 색',top:'상의',topColor:'상의 색',bottom:'하의',bottomColor:'하의 색',shoes:'신발',headwear:'머리 장식',accessory:'소품',accent:'포인트 색'};
  const fields={basic:['body','build','skin'],hair:['hairStyle','hairColor'],face:['face','eyeColor'],clothes:['top','topColor','bottom','bottomColor','shoes'],extras:['headwear','accessory','accent']};
  function open(options){
    let draft=A.normalize(options.appearance,options.characterId),tab='basic',model,busy=false,closed=false;
    const lockedBody=draft.body,previousFocus=document.activeElement;
    const host=document.createElement('section');host.className='ix-wardrobe';host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-label',options.create?'처음 캐릭터 만들기':'캐릭터 꾸미기');
    host.innerHTML=`<div class="ix-wardrobe-card"><header class="ix-wardrobe-header"><div><span class="ix-studio-tag">이슬숲 옷장</span><h1>${options.create?'처음 만나는 나의 캐릭터':escape(options.name)+'의 꾸미기'}</h1><p>${options.create?'캐릭터와 이름은 한 번만 정해요. 옷과 헤어는 나중에도 바꿀 수 있어요.':'캐릭터와 이름은 그대로, 오늘의 스타일을 골라 보세요.'}</p></div>${options.create?'':'<button type="button" data-editor="cancel" aria-label="꾸미기 닫기">✕</button>'}</header><div class="ix-wardrobe-content"><div class="ix-avatar-studio"><canvas aria-label="캐릭터 3D 미리보기. 드래그해서 회전" tabindex="0"></canvas><div class="ix-studio-controls"><button type="button" data-editor="rotate-left" aria-label="캐릭터 왼쪽 회전">↶</button><button type="button" data-editor="zoom">얼굴 확대</button><button type="button" data-editor="rotate-right" aria-label="캐릭터 오른쪽 회전">↷</button></div><small>드래그로 돌려 보기 · 변경 모습 바로 확인</small><div class="ix-style-presets" aria-label="스타일 추천">${A.presets.map((p,i)=>`<button type="button" data-editor="preset" data-index="${i}"><i style="background:${p.values.topColor||A.defaults.topColor}"></i>${p.name}</button>`).join('')}</div></div><div class="ix-wardrobe-settings"><nav class="ix-style-tabs" aria-label="꾸미기 분류">${tabs.map(([id,label])=>`<button type="button" data-editor="tab" data-tab="${id}" aria-pressed="${id===tab}">${label}</button>`).join('')}</nav><div class="ix-style-fields"></div></div></div><footer class="ix-wardrobe-footer">${options.create?'<label class="ix-name-field" for="explorer-name">탐험가 이름 <input id="explorer-name" maxlength="6" placeholder="한글 1~6자" autocomplete="off" aria-describedby="ix-name-hint"><small id="ix-name-hint">생성 후 이름을 변경할 수 없어요.</small></label>':'<span class="ix-style-note">저장해야 게임에 반영됩니다.</span>'}<p class="ix-style-error" role="status" aria-live="polite"></p><div class="ix-style-actions">${options.create?'':'<button type="button" data-editor="cancel">취소</button>'}<button type="button" id="${options.create?'enter-world':'save-appearance'}" data-editor="save">${options.create?'이 모습으로 시작':'꾸미기 저장'}</button></div></footer></div>`;
    document.body.appendChild(host);document.body.classList.add('is-customizing');options.onOpen?.();
    const fieldRoot=host.querySelector('.ix-style-fields'),canvas=host.querySelector('canvas');
    const engine=new B.Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true});engine.setHardwareScalingLevel(Math.max(1,global.devicePixelRatio||1));
    const scene=new B.Scene(engine);scene.clearColor=new B.Color4(.94,.935,.985,1);
    const camera=new B.ArcRotateCamera('wardrobe-camera',Math.PI/2-.25,1.33,5.4,new B.Vector3(0,1.4,0),scene);camera.attachControl(canvas,true);camera.lowerRadiusLimit=2.5;camera.upperRadiusLimit=7;camera.lowerBetaLimit=.65;camera.upperBetaLimit=1.6;camera.panningSensibility=0;camera.wheelPrecision=70;
    const light=new B.HemisphericLight('wardrobe-light',new B.Vector3(-.5,1,1),scene);light.intensity=.74;light.groundColor=new B.Color3(.43,.38,.48);
    const fill=new B.DirectionalLight('wardrobe-fill',new B.Vector3(.4,-.6,-1),scene);fill.intensity=.24;
    const floor=B.MeshBuilder.CreateCylinder('display-plinth',{diameter:2.55,height:.12,tessellation:64},scene);floor.position.y=-.06;const floorMat=new B.StandardMaterial('plinth-material',scene);floorMat.diffuseColor=B.Color3.FromHexString('#d9d0ed');floor.material=floorMat;
    function preview(){
      if(model){const materials=new Set(model.getChildMeshes().map(m=>m.material).filter(Boolean));model.dispose(false,false);materials.forEach(m=>m.dispose(false,true));}
      model=global.InsectWorld.createAvatarModel(scene,options.characterId||'original','',draft);
      model.getChildMeshes().filter(m=>m.name==='label').forEach(m=>m.setEnabled(false));
      model.position.y=.08;
    }
    function renderFields(){
      host.querySelectorAll('[data-editor="tab"]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tab===tab));
      fieldRoot.innerHTML=fields[tab].filter(key=>options.create||key!=='body').map(key=>{
        const colors=A.colors[key],list=colors||A.options[key];
        return `<fieldset><legend>${labels[key]}</legend><div class="${colors?'ix-color-options':'ix-style-options'}">${list.map(([value,label])=>`<button type="button" data-editor="option" data-key="${key}" data-value="${value}" aria-pressed="${draft[key]===value}" aria-label="${labels[key]}: ${label}" title="${label}">${colors?`<i style="background:${value}"></i><span>${label}</span>`:label}</button>`).join('')}</div></fieldset>`;
      }).join('')+(tab==='basic'?`<label class="ix-height-field" for="avatar-height">키 <output>${Math.round(draft.height*100)}%</output><input id="avatar-height" type="range" min="90" max="110" step="1" value="${Math.round(draft.height*100)}"><span>아담하게 <span>훤칠하게</span></span></label>`:'');
    }
    function close(){if(closed)return;closed=true;resize.disconnect();engine.stopRenderLoop();scene.dispose();engine.dispose();host.remove();document.body.classList.remove('is-customizing');options.onClose?.();if(previousFocus?.isConnected)previousFocus.focus();}
    const resize=new ResizeObserver(()=>engine.resize());resize.observe(canvas);
    host.addEventListener('input',event=>{if(event.target.id==='avatar-height'){draft.height=Number(event.target.value)/100;host.querySelector('output').textContent=event.target.value+'%';preview();}});
    host.addEventListener('click',async event=>{
      const button=event.target.closest('[data-editor]');if(!button||busy)return;
      const act=button.dataset.editor;
      if(act==='tab'){tab=button.dataset.tab;renderFields();return;}
      if(act==='option'){draft[button.dataset.key]=button.dataset.value;preview();host.querySelectorAll('[data-key="'+button.dataset.key+'"]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.value===draft[button.dataset.key]));return;}
      if(act==='preset'){const height=draft.height;draft=A.normalize({...A.defaults,...A.presets[Number(button.dataset.index)].values,height});if(!options.create)draft.body=lockedBody;renderFields();preview();return;}
      if(act==='rotate-left'||act==='rotate-right'){camera.alpha+=(act==='rotate-left'?1:-1)*.45;return;}
      if(act==='zoom'){const near=camera.radius<4;camera.radius=near?5.4:2.6;camera.target.y=near?1.4:2.05*draft.height;button.textContent=near?'얼굴 확대':'전신 보기';return;}
      if(act==='cancel'){close();return;}
      if(act==='save'){
        const name=options.create?host.querySelector('#explorer-name').value.trim():options.name,error=host.querySelector('.ix-style-error');
        if(options.create&&!/^[가-힣]{1,6}$/.test(name)){error.textContent='이름을 한글 1~6자로 입력해 주세요.';host.querySelector('#explorer-name').focus();return;}
        busy=true;host.querySelectorAll('button,input').forEach(e=>e.disabled=true);error.textContent='저장하고 있어요…';
        try{await options.onSave({appearance:{...draft},name});close();}
        catch(e){error.textContent=e.message||'저장하지 못했어요. 연결을 확인한 뒤 다시 눌러 주세요.';}
        finally{busy=false;if(!closed)host.querySelectorAll('button,input').forEach(e=>e.disabled=false);}
      }
    });
    host.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&!options.create&&!busy){event.preventDefault();close();return;}
      if(event.key==='Tab'){const els=[...host.querySelectorAll('button,input,canvas')].filter(e=>!e.disabled&&e.getClientRects().length),first=els[0],last=els.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
      event.stopPropagation();
    });
    renderFields();preview();engine.resize();engine.runRenderLoop(()=>scene.render());
    host.querySelector(options.create?'#explorer-name':'[data-editor="cancel"]').focus({preventScroll:true});
    return {close,getAppearance:()=>({...draft})};
  }
  global.InsectAppearanceUI={open};
})(window);
