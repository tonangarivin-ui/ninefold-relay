// Analytic hitboxes keep combat independent of the render graph. Cover always wins the ray.
import { WEAPONS } from './config.js';
function boxRay(ox,oy,oz,dx,dy,dz,x0,y0,z0,x1,y1,z1){
  let lo=0,hi=1000;
  if(Math.abs(dx)<1e-9){if(ox<x0||ox>x1)return Infinity;}else{const a=(x0-ox)/dx,b=(x1-ox)/dx;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}
  if(Math.abs(dy)<1e-9){if(oy<y0||oy>y1)return Infinity;}else{const a=(y0-oy)/dy,b=(y1-oy)/dy;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}
  if(Math.abs(dz)<1e-9){if(oz<z0||oz>z1)return Infinity;}else{const a=(z0-oz)/dz,b=(z1-oz)/dz;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}
  return hi>=lo?lo:Infinity;
}
export function wallDistance(map,ox,oy,oz,dx,dy,dz){
  let dist=1000;
  for(const b of map.colliders){if(b.gateOpen)continue;dist=Math.min(dist,boxRay(ox,oy,oz,dx,dy,dz,b.min.x,b.min.y,b.min.z,b.max.x,b.max.y,b.max.z));}
  return dist;
}
export function createCombat(s,map){
  function visible(a,b){
    const dx=b.position.x-a.position.x,dy=b.position.y+b.eye*.8-a.position.y-a.eye,dz=b.position.z-a.position.z,l=Math.hypot(dx,dy,dz);
    return wallDistance(map,a.position.x,a.position.y+a.eye,a.position.z,dx/l,dy/l,dz/l)>l-.2;
  }
  function damage(v,amount,a,head=false){
    if(!v.alive||v.team===a.team)return;
    const reduced=v.armor>0&&!head?amount*.72:amount;
    v.armor=Math.max(0,v.armor-amount*.3);v.health=Math.max(0,v.health-reduced);v.untouched=false;
    if(v===s.player){s.hurt=.7;s.audio.event('hurt');}
    if(a===s.player){s.hit=.16;s.headhit=head;s.audio.event(head?'head':'hit');}
    s.effects.impact(v.position.x,v.position.y+(head?v.eye:1),v.position.z,head);
    if(v.health>0)return;
    v.alive=false;v.deaths++;a.kills++;a.money=Math.min(16000,a.money+WEAPONS[a.weapon].reward);s.deathSerial++;
    s.feed.unshift({killer:a.name,victim:v.name,weapon:WEAPONS[a.weapon].name,head,time:s.time});if(s.feed.length>4)s.feed.pop();
    if(s.bomb.carrier===v.id&&!s.bomb.planted){s.bomb.carrier=-1;s.bomb.dropped=true;s.bomb.x=v.position.x;s.bomb.z=v.position.z;}
  }
  function spread(a){return WEAPONS[a.weapon].spread+Math.min(1,Math.hypot(a.velocity.x,a.velocity.z)/5)*.032*(a.crouching?.5:1)+(a.onGround?0:.038)+a.recoil*.18;}
  function fire(a,yaw=a.yaw,pitch=a.pitch){
    if(!a.alive||a.cooldown>0||a.reloadLeft>0||a.mag<=0||s.phase!=='playing')return false;
    const w=WEAPONS[a.weapon],ox=a.position.x,oy=a.position.y+a.eye,oz=a.position.z;
    a.mag--;a.cooldown=w.interval;a.flash=.055;
    const cone=spread(a)*(a.crouching?.6:1);
    for(let pellet=0;pellet<w.pellets;pellet++){
      const y=yaw+a.recoilYaw+(s.rng()-.5)*cone*2,p=pitch+(a.id===0?a.recoil:0)+(s.rng()-.5)*cone*2;
      const dx=-Math.sin(y)*Math.cos(p),dy=Math.sin(p),dz=-Math.cos(y)*Math.cos(p);
      let closest=Math.min(w.range,wallDistance(map,ox,oy,oz,dx,dy,dz)),victim=null,mult=1;
      for(const b of s.actors){
        if(!b.alive||b.team===a.team)continue;
        const x=b.position.x,z=b.position.z,feet=b.position.y,hy=feet+b.eye-.02;
        const vx=ox-x,vy=oy-hy,vz=oz-z,dot=vx*dx+vy*dy+vz*dz,disc=dot*dot-(vx*vx+vy*vy+vz*vz-.19*.19);
        if(disc>=0){const t=-dot-Math.sqrt(disc);if(t>=0&&t<closest){closest=t;victim=b;mult=4;}}
        const torso=boxRay(ox,oy,oz,dx,dy,dz,x-.29,feet+(b.crouching?.43:.72),z-.2,x+.29,hy-.19,z+.2);
        if(torso<closest){closest=torso;victim=b;mult=1;}
        const legs=boxRay(ox,oy,oz,dx,dy,dz,x-.23,feet+.05,z-.19,x+.23,feet+(b.crouching?.43:.72),z+.19);
        if(legs<closest){closest=legs;victim=b;mult=.7;}
      }
      s.effects.trace(ox,oy-.08,oz,ox+dx*closest,oy+dy*closest,oz+dz*closest,a.team);
      if(victim)damage(victim,w.damage*mult*(a.weapon==='harrow'?Math.max(.28,1-closest/48):1),a,mult===4);
      else s.effects.impact(ox+dx*closest,oy+dy*closest,oz+dz*closest,false);
    }
    const index=w.mag-a.mag;
    a.recoil=Math.min(.15,a.recoil+w.kick*(index<4?.7:1.2));
    a.recoilYaw+=Math.sin(index*1.75)*w.kick*.22;
    s.noise(a,a.weapon==='harrow'?48:40);s.audio.event(a.weapon,ox,oz);
    return true;
  }
  function reload(a){
    const w=WEAPONS[a.weapon];if(a.reloadLeft||a.mag>=w.mag||!a.reserve)return;
    a.reloadLeft=w.reload;a.burst=0;s.audio.event('reload',a.position.x,a.position.z);
  }
  function switchWeapon(a,key){
    if(!a.ammo[key])return;
    a.ammo[a.weapon].mag=a.mag;a.ammo[a.weapon].reserve=a.reserve;
    a.weapon=key;a.mag=a.ammo[key].mag;a.reserve=a.ammo[key].reserve;a.reloadLeft=0;a.cooldown=.2;a.recoil=0;a.burst=0;
  }
  function step(dt){
    for(const a of s.actors){
      a.cooldown=Math.max(0,a.cooldown-dt);a.flash=Math.max(0,a.flash-dt);
      a.recoil=Math.max(0,a.recoil-dt*.09);a.recoilYaw*=Math.max(0,1-dt*7);
      if(a.reloadLeft>0){a.reloadLeft=Math.max(0,a.reloadLeft-dt);if(!a.reloadLeft){const n=Math.min(WEAPONS[a.weapon].mag-a.mag,a.reserve);a.mag+=n;a.reserve-=n;s.audio.event('click',a.position.x,a.position.z);}}
    }
    for(const g of s.grenades){
      if(!g.active)continue;g.fuse-=dt;g.vy-=14*dt;
      const nx=g.x+g.vx*dt,nz=g.z+g.vz*dt;
      if(wallDistance(map,g.x,g.y,g.z,Math.sign(g.vx),0,0)<Math.abs(g.vx*dt)+.1)g.vx*=-.5;else g.x=nx;
      if(wallDistance(map,g.x,g.y,g.z,0,0,Math.sign(g.vz))<Math.abs(g.vz*dt)+.1)g.vz*=-.5;else g.z=nz;
      g.y+=g.vy*dt;if(g.y<.15){g.y=.15;g.vy=Math.abs(g.vy)*.4;g.vx*=.83;g.vz*=.83;}
      if(g.fuse<=0){g.active=false;s.audio.event('grenade',g.x,g.z);s.effects.impact(g.x,g.y,g.z,true);for(const v of s.actors){const d=Math.hypot(v.position.x-g.x,v.position.z-g.z);if(d<7&&wallDistance(map,g.x,g.y+.3,g.z,(v.position.x-g.x)/Math.max(.01,d),.08,(v.position.z-g.z)/Math.max(.01,d))>=d-.5)damage(v,140*(1-d/7),s.actors[g.owner]);}}
    }
  }
  function grenade(a){
    if(!a.alive||!a.grenades||s.phase!=='playing')return;
    for(const g of s.grenades)if(!g.active){a.grenades--;g.active=true;g.owner=a.id;g.x=a.position.x;g.y=a.position.y+a.eye;g.z=a.position.z;g.vx=-Math.sin(a.yaw)*12;g.vz=-Math.cos(a.yaw)*12;g.vy=4+Math.sin(a.pitch)*8;g.fuse=1.7;s.audio.event('click');return;}
  }
  return {fire,reload,damage,visible,spread,switchWeapon,step,grenade};
}
