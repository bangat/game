'use strict';
const Data=require('../shared/data.js'),Regions=require('../shared/regions.js'),Nav=require('../shared/navigation.js');
const DETECT=18,RELEASE=34,CATCH=2.4,SPEED=6.2,LOCK_MS=30000;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function create(){return Data.biomes.flatMap(b=>{
 const quiet=b.safe||['lumber','quarry','sandpit'].includes(b.id),points=b.safe?[[-36,31]]:quiet?[[-52,12]]:[[-23,44],[28,-22]];
 return points.map(([x,z],i)=>{while(Regions.blocked(b.id,{x,z},2)){x+=3;z+=3;}
  return {id:'zombie-'+b.id+'-'+i,speciesId:'forest_zombie',zombie:true,regionId:b.id,biomeId:b.id,x,z,home:{x,z},level:b.safe?2:quiet?5:Math.max(3,Math.round((b.levels[0]+b.levels[1])/2)),targetUid:null,mode:'idle',available:true,respawnAt:0,route:[],routeAt:0};
 });
});}
function eligible(p,now){return p.connected&&p.zombieClient!==false&&p.profile.characterCreated&&!p.realm&&!p.busy&&!p.battleId&&!p.harvest&&(p.profile.zombieGraceUntil||0)<=now&&(p.profile.movementLockedUntil||0)<=now&&p.profile.collection.some(c=>c.hp==null||c.hp>0);}
function publicState(room,player){return player.realm?[]:room.zombies.filter(z=>z.regionId===player.regionId).map(z=>({id:z.id,speciesId:z.speciesId,x:z.x,z:z.z,level:z.level,mode:z.mode,targetUid:z.targetUid,available:z.available}));}
function release(z,now,won){z.targetUid=null;z.mode='rest';z.available=false;z.respawnAt=now+(won?60000:15000);z.route=[];z.reservedBy=null;}
async function tick(room,now,startBattle){
 const dt=Math.min(.4,Math.max(0,(now-(room.zombieTickAt??now))/1000));room.zombieTickAt=now;
 for(const z of room.zombies){
  if(z.mode==='engaged')continue;
  if(!z.available){if(now<z.respawnAt)continue;Object.assign(z,{...z.home,available:true,mode:'idle',targetUid:null,route:[],routeAt:0});}
  Nav.setRegion(z.regionId);
  let target=z.targetUid&&room.players.get(z.targetUid);
  if(target&&(!eligible(target,now)||target.regionId!==z.regionId||distance(z,target)>RELEASE||distance(target,z.home)>65)){target=null;z.targetUid=null;z.mode='return';z.route=[];z.routeAt=0;}
  if(!target&&z.mode!=='return'){
   target=[...room.players.values()].filter(p=>p.regionId===z.regionId&&eligible(p,now)&&distance(z,p)<=DETECT&&Nav.clear(z,p)).sort((a,b)=>distance(z,a)-distance(z,b))[0];
   if(target){z.targetUid=target.uid;z.mode='chase';z.routeAt=0;}
  }
  const goal=target||z.home;
  if(!target&&distance(z,z.home)<.6){z.mode='idle';continue;}
  if(target&&distance(z,target)<=CATCH&&Nav.clear(z,target)){
   z.mode='engaged';z.available=false;z.reservedBy=target.uid;
   try{await startBattle(target,z);}catch{release(z,now,false);}continue;
  }
  if(now>=z.routeAt){z.route=Nav.route(z,goal);z.routeAt=now+900;}
  const next=z.route[0];if(!next)continue;const d=distance(z,next),step=Math.min(d,SPEED*dt*(target?1:.65));
  const point=d?{x:z.x+(next.x-z.x)/d*step,z:z.z+(next.z-z.z)/d*step}:next;
  if(Nav.clear(z,point)){z.x=point.x;z.z=point.z;if(d<=step+.15)z.route.shift();}else z.routeAt=0;
 }
}
module.exports={DETECT,RELEASE,CATCH,SPEED,LOCK_MS,create,eligible,publicState,release,tick};
