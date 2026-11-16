// Upright capsule against boxes: closest-point push, sliding, step-up and ceiling checks.
import * as THREE from 'three';
import { NAMES, RULES, WEAPONS } from './config.js';
export function createActor(id,spawn){
  const w=WEAPONS.patern;
  return {id,name:NAMES[id],team:id<5?0:1,position:new THREE.Vector3(spawn[0],0,spawn[1]),velocity:new THREE.Vector3(),yaw:0,pitch:0,eye:1.6,height:1.78,onGround:true,crouching:false,health:100,alive:true,kills:0,deaths:0,money:RULES.start,armor:0,kit:false,grenades:0,primary:null,weapon:'patern',mag:w.mag,reserve:w.reserve,ammo:{patern:{mag:w.mag,reserve:w.reserve}},cooldown:0,reloadLeft:0,recoil:0,recoilYaw:0,flash:0,burst:0,trigger:false,foot:0,untouched:true,route:'',waypoint:0,memory:0,target:-1,reaction:0,think:0,hold:0,lastX:0,lastZ:0,heard:0,aimX:0,aimZ:0,stuck:0,retreat:0,mode:'AUTO'};
}
function clearAt(a,map,height){
  const x=a.position.x,z=a.position.z,y=a.position.y;
  for(const b of map.colliders){
    if(b.gateOpen||b.max.y<=y+.03||b.min.y>=y+height)continue;
    const dx=x-Math.max(b.min.x,Math.min(x,b.max.x));
    const dz=z-Math.max(b.min.z,Math.min(z,b.max.z));
    if(dx*dx+dz*dz<.34*.34)return false;
  }
  return true;
}
export function moveActor(a,map,dt,wx,wz,speed,jump=false,crouch=false){
  if(!a.alive)return;
  if(crouch){a.crouching=true;a.height=1.15;}
  else if(clearAt(a,map,1.78)){a.crouching=false;a.height=1.78;}
  a.eye+=((a.crouching?1.02:1.6)-a.eye)*Math.min(1,dt*14);
  const len=Math.hypot(wx,wz); if(len>1){wx/=len;wz/=len;}
  if(a.crouching)speed=Math.min(speed,2.1);
  const blend=Math.min(1,dt*(a.onGround?11:2.4));
  a.velocity.x+=(wx*speed-a.velocity.x)*blend;
  a.velocity.z+=(wz*speed-a.velocity.z)*blend;
  if(!len&&a.onGround){a.velocity.x*=Math.max(0,1-dt*9);a.velocity.z*=Math.max(0,1-dt*9);}
  if(jump&&a.onGround){a.velocity.y=5.8;a.onGround=false;}
  a.velocity.y=Math.max(-25,a.velocity.y-19*dt);
  a.position.x+=a.velocity.x*dt; a.position.z+=a.velocity.z*dt;
  // Four passes resolve corners without allocating a collision object per frame.
  for(let pass=0;pass<4;pass++)for(const b of map.colliders){
    if(b.gateOpen||b.max.y<=a.position.y+.025||b.min.y>=a.position.y+a.height-.02)continue;
    const x=a.position.x,z=a.position.z;
    let dx=x-Math.max(b.min.x,Math.min(x,b.max.x)),dz=z-Math.max(b.min.z,Math.min(z,b.max.z));
    const d2=dx*dx+dz*dz;
    if(d2>=.34*.34)continue;
    if(a.onGround&&b.max.y-a.position.y<=.36&&b.max.y>0){a.position.y=b.max.y;continue;}
    if(d2>.000001){const push=(.3401-Math.sqrt(d2))/Math.sqrt(d2);a.position.x+=dx*push;a.position.z+=dz*push;}
    else {const l=x-b.min.x,r=b.max.x-x,n=z-b.min.z,f=b.max.z-z,m=Math.min(l,r,n,f);if(m===l)a.position.x=b.min.x-.341;else if(m===r)a.position.x=b.max.x+.341;else if(m===n)a.position.z=b.min.z-.341;else a.position.z=b.max.z+.341;}
  }
  const oldY=a.position.y;
  a.position.y+=a.velocity.y*dt;a.onGround=false;
  let floor=0;
  for(const b of map.colliders){
    if(b.gateOpen||a.position.x+.29<b.min.x||a.position.x-.29>b.max.x||a.position.z+.29<b.min.z||a.position.z-.29>b.max.z)continue;
    if(a.velocity.y<=0&&oldY>=b.max.y-.03&&a.position.y<=b.max.y)floor=Math.max(floor,b.max.y);
    if(a.velocity.y>0&&oldY+a.height<=b.min.y+.03&&a.position.y+a.height>b.min.y){a.position.y=b.min.y-a.height;a.velocity.y=0;}
  }
  if(a.position.y<=floor){a.position.y=floor;a.velocity.y=0;a.onGround=true;}
}
export function stepPlayer(s,input,map,dt){
  const a=s.player,k=input.keys;
  a.yaw-=input.lookX*.0022; a.pitch=Math.max(-1.4,Math.min(1.4,a.pitch-input.lookY*.0022));input.lookX=0;input.lookY=0;
  const f=Number(k.has('KeyW'))-Number(k.has('KeyS')),r=Number(k.has('KeyD'))-Number(k.has('KeyA'));
  const quiet=k.has('ShiftLeft')||k.has('ShiftRight');
  moveActor(a,map,dt,-Math.sin(a.yaw)*f+Math.cos(a.yaw)*r,-Math.cos(a.yaw)*f-Math.sin(a.yaw)*r,quiet?2.4:5.1,k.has('Space'),k.has('KeyC')||k.has('ControlLeft')||k.has('ControlRight'));
  a.foot-=dt;
  if(a.onGround&&Math.hypot(a.velocity.x,a.velocity.z)>1&&a.foot<=0){a.foot=quiet?.62:.35;s.audio.event('step',a.position.x,a.position.z,a.position.y>1?'metal':'concrete');if(!quiet)s.noise(a,10);}
}
