// Round authority: objectives, roster, economy and match progression. No wall-clock reads.
import { RULES, WEAPONS, BUY } from './config.js';
export function createRounds(s,map,combat,input){
  function announce(text){s.hud?.updateStatus(text);}
  function equip(a,key){
    const w=WEAPONS[key];a.ammo[key]={mag:w.mag,reserve:w.reserve};
    a.weapon=key;a.mag=w.mag;a.reserve=w.reserve;a.reloadLeft=0;a.cooldown=0;
  }
  function canBuy(){return s.player.alive&&(s.phase==='buy'||(s.phase==='playing'&&s.player.untouched&&s.player.position.z>12));}
  function buy(index){
    const a=s.player,item=BUY[index];if(!item||!canBuy()||a.money<item.price)return false;
    if((item.id==='grenade'&&a.grenades>=1)||(item.id==='armor'&&a.armor>=100)||(item.id==='kit'&&a.kit))return false;
    a.money-=item.price;
    if(WEAPONS[item.id]){a.primary=item.id;equip(a,item.id);}
    else if(item.id==='grenade')a.grenades=1;else if(item.id==='armor')a.armor=100;else a.kit=true;
    s.audio.event('click');return true;
  }
  function gate(open){if(map.gate)map.gate.gateOpen=open;for(const b of map.colliders)if(b.isGate)b.gateOpen=open;}
  function startRound(){
    s.round=s.history.length+1;
    const half=s.round===5;
    s.phase='buy';s.buyLeft=RULES.buy;s.timer=RULES.round;s.buyOpen=true;s.reason='';s.roundLeft=0;s.hit=0;s.hurt=0;s.deathSerial=0;
    const b=s.bomb;b.planted=false;b.carrier=0;b.dropped=false;b.site='';b.x=0;b.z=16;b.fuse=RULES.fuse;b.progress=0;b.defuse=0;b.beep=0;b.planter=-1;b.defuser=-1;
    for(const a of s.actors){
      const survived=a.alive&&s.round>1;
      if(half)a.money=RULES.start;
      a.position.set(map.spawns[a.id][0],0,map.spawns[a.id][1]);a.velocity.set(0,0,0);a.yaw=a.team?Math.PI:0;a.pitch=0;a.eye=1.6;a.height=1.78;a.crouching=false;a.onGround=true;
      a.health=100;a.alive=true;a.untouched=true;a.reaction=0;a.memory=0;a.target=-1;a.route='';a.waypoint=0;a.think=a.id*.021;a.recoil=0;a.recoilYaw=0;a.flash=0;a.burst=0;a.trigger=false;a.hold=0;a.retreat=0;
      if(!survived||half){a.primary=null;a.armor=0;a.kit=false;a.grenades=0;a.ammo={patern:{mag:15,reserve:60}};}
      equip(a,a.primary||'patern');
      if(a.id){
        if(a.money>=2400&&!a.primary){a.money-=2400;a.primary='kestrel';equip(a,'kestrel');}
        else if(a.money>=1800&&!a.primary&&a.id%3===0){a.money-=1800;a.primary='harrow';equip(a,'harrow');}
        if(a.money>=650){a.money-=650;a.armor=100;}
      }
    }
    s.feed.length=0;for(const g of s.grenades)g.active=false;
    gate(false);announce(`Round ${s.round}. Attackers ${s.score[0]}, Defenders ${s.score[1]}. Eight second buy period.`);s.audio.event('start');
  }
  function restart(){s.score[0]=0;s.score[1]=0;s.history.length=0;for(const a of s.actors){a.kills=0;a.deaths=0;a.money=RULES.start;a.alive=false;}s.paused=false;startRound();}
  function finish(winner,reason){
    if(s.phase!=='playing')return;
    s.phase='round';s.winner=winner;s.reason=reason;s.roundLeft=5;s.buyOpen=false;s.score[winner]++;
    s.history.push({winner,reason});
    for(const a of s.actors)a.money=Math.min(16000,a.money+(a.team===winner?RULES.win:RULES.loss));
    s.audio.event(winner===0?'win':'loss');announce(`${winner===0?'Attackers':'Defenders'} win. ${reason}. Score ${s.score[0]} to ${s.score[1]}.`);
  }
  function objective(dt){
    const b=s.bomb;
    if(!b.planted){
      if(b.dropped)for(const a of s.actors)if(a.alive&&a.team===0&&Math.hypot(a.position.x-b.x,a.position.z-b.z)<1.5){b.carrier=a.id;b.dropped=false;announce(`${a.name} recovered the Relay.`);break;}
      const a=s.actors[b.carrier];let site=null;
      if(a?.alive)for(const p of map.sites)if(Math.hypot(a.position.x-p.x,a.position.z-p.z)<p.r&&a.position.y<.6){site=p;break;}
      const planting=site&&a?.alive&&(a.id===0?input.keys.has('KeyE'):a.memory<=0)&&Math.hypot(a.velocity.x,a.velocity.z)<.8;
      if(planting){
        b.site=site.id;b.progress+=dt/(a.kit?RULES.kitPlant:RULES.plant);b.planter=a.id;
        if(b.progress>=1){b.planted=true;b.x=a.position.x;b.z=a.position.z;b.fuse=RULES.fuse;b.progress=1;b.carrier=-1;b.beep=0;for(const p of s.actors)if(p.team===0)p.money=Math.min(16000,p.money+300);announce(`Relay planted at site ${b.site}. Forty seconds to detonation.`);s.audio.event('plant');}
      }else{b.progress=0;b.planter=-1;}
    }else{
      b.fuse=Math.max(0,b.fuse-dt);b.beep-=dt;
      if(b.beep<=0){b.beep=.16+.85*b.fuse/RULES.fuse;s.audio.event('beep',b.x,b.z);}
      let defuser=null;
      for(const a of s.actors){if(!a.alive||a.team!==1||Math.hypot(a.position.x-b.x,a.position.z-b.z)>1.9||a.position.y>.6)continue;
        let danger=false,cover=false;
        for(const v of s.actors)if(v.alive&&v.id!==a.id){if(v.team===1&&Math.hypot(v.position.x-a.position.x,v.position.z-a.position.z)<12)cover=true;else if(v.team===0&&combat.visible(a,v))danger=true;}
        if(!danger||cover){defuser=a;break;}
      }
      if(defuser){b.defuser=defuser.id;b.defuse+=dt/RULES.defuse;if(b.defuse>=1){finish(1,'RELAY DEFUSED');s.audio.event('defuse');return;}}
      else{b.defuse=0;b.defuser=-1;}
      if(b.fuse<=0){s.effects.impact(b.x,.8,b.z,true);s.audio.event('grenade',b.x,b.z);finish(0,'RELAY DETONATED');return;}
    }
  }
  function step(dt){
    if(s.phase==='buy'){s.buyLeft=Math.max(0,s.buyLeft-dt);if(!s.buyLeft){s.phase='playing';s.buyOpen=false;gate(true);s.audio.event('start');announce(`Round ${s.round} live. Plant the Relay at A or B.`);}return;}
    if(s.phase==='round'){s.roundLeft-=dt;if(s.roundLeft<=0){if(s.score[0]>=5||s.score[1]>=5){s.phase='end';s.paused=false;announce(`Match complete. ${s.score[0]} to ${s.score[1]}. Press Enter to restart.`);}else startRound();}return;}
    if(s.phase!=='playing')return;
    s.timer=Math.max(0,s.timer-dt);objective(dt);if(s.phase!=='playing')return;
    let atk=0,def=0;for(const a of s.actors)if(a.alive){if(a.team===0)atk++;else def++;}
    if(!def)finish(0,'DEFENDERS ELIMINATED');else if(!atk&&!s.bomb.planted)finish(1,'ATTACKERS ELIMINATED');else if(!s.timer&&!s.bomb.planted)finish(1,'TIME EXPIRED');
    if(!s.player.alive&&!s.bomb.planted&&s.bomb.carrier===0){s.bomb.carrier=-1;s.bomb.dropped=true;}
  }
  return {startRound,restart,finish,step,buy,canBuy,equip};
}
