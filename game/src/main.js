// Ninefold Relay — boot and a 60 Hz simulation. Rendering cannot alter game outcomes.
import { STEP } from './config.js';
import { mulberry32 } from './random.js';
import { createMap } from './map.js';
import { createActor, stepPlayer } from './player.js';
import { createCombat } from './weapon.js';
import { stepBots } from './bots.js';
import { createRounds } from './round.js';
import { createHud } from './hud.js';
import { createRender } from './render.js';
import { createEffects } from './effects.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { stageShot } from './shots.js';
const params=new URLSearchParams(location.search),seed=Number.parseInt(params.get('seed')||'1',10)||1;
const map=createMap(),effects=createEffects(),audio=createAudio();
const s={seed,rng:mulberry32(seed),time:0,phase:'title',paused:false,buyOpen:false,scoreboard:false,round:1,timer:95,buyLeft:8,score:[0,0],history:[],feed:[],reason:'',winner:0,roundLeft:0,deathSerial:0,actors:[],player:null,bomb:{planted:false,carrier:0,dropped:false,x:0,z:17,site:'',fuse:40,progress:0,defuse:0,beep:0,planter:-1,defuser:-1},grenades:Array.from({length:8},()=>({active:false,x:0,y:0,z:0,vx:0,vy:0,vz:0,fuse:0,owner:0})),view:{kick:0,flash:0,shake:0},hit:0,headhit:false,hurt:0,spread:.002,mode:'AUTO',shot:params.get('shot'),cameraOverride:null,effects,audio,noise:null,hud:null};
for(let id=0;id<10;id++)s.actors.push(createActor(id,map.spawns[id]));s.player=s.actors[0];audio.setListener(s.player);
s.noise=(a,radius)=>{for(const b of s.actors)if(b.alive&&b.team!==a.team&&Math.hypot(b.position.x-a.position.x,b.position.z-a.position.z)<radius){b.lastX=a.position.x;b.lastZ=a.position.z;b.memory=Math.max(b.memory,3.5);b.heard=s.time;}};
const render=createRender(map,s,effects);document.getElementById('game').appendChild(render.canvas);render.resize();
const input=createInput(render.canvas,locked=>{if(s.shot)return;if(!locked&&s.phase!=='title'&&s.phase!=='end')s.paused=true;else if(locked)s.paused=false;});
const combat=createCombat(s,map),rounds=createRounds(s,map,combat,input.state);
function play(){audio.start();if(s.phase==='title'||s.phase==='end')rounds.restart();s.paused=false;input.requestLock();}
s.hud=createHud(s,{play,buy:rounds.buy,closeBuy(){s.buyOpen=false;},restart:play});
function controls(){
  const i=input.state,p=s.player,keys=i.pressed;s.scoreboard=i.keys.has('Tab');
  if(keys.has('Enter')&&(s.phase==='title'||s.phase==='end'||s.paused))play();
  if(keys.has('KeyB')&&rounds.canBuy())s.buyOpen=!s.buyOpen;
  if(keys.has('Escape'))s.buyOpen=false;
  if(s.buyOpen){for(let n=1;n<=5;n++)if(keys.has('Digit'+n))rounds.buy(n-1);}
  else {
    if(keys.has('KeyQ'))combat.switchWeapon(p,p.weapon==='patern'&&p.primary?p.primary:'patern');
    if(keys.has('Digit1')&&p.primary)combat.switchWeapon(p,p.primary);
    if(keys.has('Digit2'))combat.switchWeapon(p,'patern');
    if(keys.has('KeyR'))combat.reload(p);
    if(keys.has('KeyG'))combat.grenade(p);
    if(keys.has('KeyV')){s.mode=s.mode==='AUTO'?'BURST':'AUTO';p.burst=0;}
  }
  keys.clear();
}
function step(dt){
  controls();
  if(s.paused||s.phase==='title'||s.phase==='end')return;
  s.time+=dt;s.hit=Math.max(0,s.hit-dt);s.hurt=Math.max(0,s.hurt-dt);
  combat.step(dt);effects.step(dt);
  if(s.phase==='playing'){
    if(s.player.alive){
      stepPlayer(s,input.state,map,dt);
      const a=s.player,fire=input.state.firing&&!s.buyOpen&&!input.state.keys.has('KeyE');
      if(a.weapon==='kestrel'&&s.mode==='BURST'){
        if(fire&&!a.trigger)a.burst=3;
        if(a.burst>0&&combat.fire(a)){a.burst--;if(!a.burst)a.cooldown=.3;}
      }else if(fire&&(a.weapon!=='patern'||!a.trigger))combat.fire(a);
      a.trigger=fire;
    }
    stepBots(s,map,dt,combat);
  }
  rounds.step(dt);s.spread=combat.spread(s.player);s.view.kick=s.player.recoil;s.view.shake=s.hurt*.2;
}
// Small public inspection surface for deterministic browser checks, not a second game state.
window.__game={state:s,map,input:input.state,step(n=1){for(let i=0;i<n;i++)step(STEP);render.draw();s.hud.draw();},start(){rounds.restart();s.buyOpen=false;},combat,rounds};
window.addEventListener('resize',render.resize);
let previous=performance.now(),accumulator=0;
function frame(now){
  const elapsed=Math.max(0,(now-previous)/1000);previous=now;
  // Never drop accumulated ticks on slow frames. Catch-up changes presentation, not results.
  if(!s.shot){accumulator+=elapsed;let budget=0;while(accumulator>=STEP&&budget<240){step(STEP);accumulator-=STEP;budget++;}}
  render.draw();s.hud.draw();requestAnimationFrame(frame);
}
if(s.shot){stageShot(s,map,combat,rounds);render.draw();s.hud.draw();requestAnimationFrame(()=>{render.draw();s.hud.draw();requestAnimationFrame(()=>{render.draw();window.__shotReady=true;});});}
else s.hud.updateStatus('Ninefold Relay. Deploy as an Attacker. Plant at A or B.');
requestAnimationFrame(frame);
