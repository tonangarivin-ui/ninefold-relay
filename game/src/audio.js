// Procedural sound only. Device time schedules sound; it never drives game state.
import { mulberry32 } from './random.js';
export function createAudio(){
  let ctx=null,noise=null,listener=null;
  function start(){
    try{if(!ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;ctx=new C();noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const d=noise.getChannelData(0),rng=mulberry32(918);for(let i=0;i<d.length;i++)d[i]=rng()*2-1;}ctx.resume()?.catch(()=>{});}catch{ctx=null;}
  }
  function tone(freq,duration,volume,type='sine',offset=0,end=freq){
    if(!ctx)return;
    const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+offset;
    o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);
    g.gain.setValueAtTime(Math.max(.0001,volume),t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+duration+.02);
  }
  function hiss(duration,volume,frequency=1800,offset=0){
    if(!ctx||!noise)return;
    const n=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),t=ctx.currentTime+offset;n.buffer=noise;f.type='lowpass';f.frequency.value=frequency;
    g.gain.setValueAtTime(Math.max(.0001,volume),t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);n.connect(f);f.connect(g);g.connect(ctx.destination);n.start(t);n.stop(t+duration);
  }
  function event(name,x,z,surface){
    if(!ctx)return;
    try{
      let v=1;if(listener&&x!==undefined)v=1/(1+Math.hypot(x-listener.position.x,z-listener.position.z)*.09);
      if(name==='patern'||name==='kestrel'||name==='harrow'){const sg=name==='harrow';hiss(sg?.27:.12,.25*v,sg?1100:2300);tone(sg?95:155,.1,.16*v,'triangle',0,35);}
      else if(name==='reload'){tone(650,.04,.08*v,'square');tone(380,.07,.06*v,'square',.22);}
      else if(name==='click')tone(1000,.025,.025*v,'square');
      else if(name==='step'){hiss(.055,.07*v,surface==='metal'?2600:550);tone(surface==='metal'?180:75,.06,.025*v,'triangle');}
      else if(name==='beep'||name==='plant')tone(name==='plant'?1300:950,.08,.07*v);
      else if(name==='defuse')hiss(.5,.1,5000);
      else if(name==='grenade'){hiss(.65,.4*v,650);tone(70,.55,.3*v,'sine',0,25);}
      else if(name==='hit'||name==='head'){tone(name==='head'?1600:900,.045,.04,'triangle');}
      else if(name==='hurt')hiss(.13,.12,400);
      else if(name==='start'){tone(520,.16,.06);tone(780,.22,.06,'sine',.18);}
      else if(name==='win'||name==='loss'){const n=name==='win'?1:.7;tone(330*n,.25,.07,'triangle');tone(440*n,.25,.07,'triangle',.22);tone(660*n,.5,.07,'triangle',.44);}
    }catch{/* Audio is optional on devices without an available output. */}
  }
  return {start,event,setListener(a){listener=a;}};
}
