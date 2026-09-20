(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./data.js') : root.InsectData);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.InsectNavigation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Data) {
  'use strict';
  const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
  function blocked(p) {
    return Math.abs(p.x)>Data.world.maxX-2 || Math.abs(p.z)>Data.world.maxZ-2 || Data.obstacles.some(o=>o.type==='circle'
      ? distance(p,o)<o.radius+1.6 : Math.abs(p.x-o.x)<o.width/2+1.6 && Math.abs(p.z-o.z)<o.depth/2+1.6);
  }
  function clear(a,b) {
    const steps=Math.max(1,Math.ceil(distance(a,b)/.75));
    for(let i=1;i<=steps;i++) if(blocked({x:a.x+(b.x-a.x)*i/steps,z:a.z+(b.z-a.z)*i/steps}))return false;
    return true;
  }
  function destination(id) {
    const boss=Data.fieldBosses.find(b=>b.id===id);
    if(boss)return {id,name:boss.name,x:boss.x,z:boss.z};
    const biome=Data.biomes.find(b=>b.id===id);
    if(!biome)return null;
    const point=biome.safe?Data.startVillage:{x:biome.center.x,z:biome.center.z+(biome.center.z < -210 ? 18 : -18)};
    return {id,name:biome.name,...point};
  }
  function route(start,goal) {
    if(!goal||blocked(goal))return [];
    if(clear(start,goal))return [{x:goal.x,z:goal.z}];
    const grid=4,key=p=>p.x+','+p.z;
    const origin={x:Math.round(start.x/grid)*grid,z:Math.round(start.z/grid)*grid};
    const candidates=[];
    for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
      const p={x:origin.x+dx*grid,z:origin.z+dz*grid};
      if(!blocked(p)&&clear(start,p))candidates.push({...p,g:distance(start,p),prev:null});
    }
    const open=candidates, best=new Map(candidates.map(p=>[key(p),p.g]));
    let end=null;
    for(let n=0;open.length&&n<6000;n++){
      let index=0;
      for(let i=1;i<open.length;i++)if(open[i].g+distance(open[i],goal)<open[index].g+distance(open[index],goal))index=i;
      const current=open.splice(index,1)[0];
      if(current.g>best.get(key(current)))continue;
      if(clear(current,goal)){end=current;break;}
      for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
        if(!dx&&!dz)continue;
        const next={x:current.x+dx*grid,z:current.z+dz*grid},g=current.g+distance(current,next);
        if(g>=(best.get(key(next))??Infinity)||!clear(current,next))continue;
        best.set(key(next),g);open.push({...next,g,prev:current});
      }
    }
    if(!end)return [];
    const points=[{x:goal.x,z:goal.z}];
    for(let p=end;p;p=p.prev)points.unshift({x:p.x,z:p.z});
    const result=[];let current=start,index=0;
    while(index<points.length){let furthest=index;while(furthest+1<points.length&&clear(current,points[furthest+1]))furthest++;result.push(points[furthest]);current=points[furthest];index=furthest+1;}
    return result;
  }
  return {distance,blocked,clear,destination,route};
});
