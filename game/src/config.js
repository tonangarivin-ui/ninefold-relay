// Ninefold Relay — all tuning is expressed in seconds, metres and dollars.
export const STEP = 1 / 60;
export const RULES = { round:95, buy:8, fuse:40, plant:5, kitPlant:3, defuse:6, target:5, win:3250, loss:1900, kill:300, start:800 };
export const PALETTE = { concrete:0x53616a, shadow:0x101b23, rust:0xba5534, sodium:0xffc37d, relay:0x7ce5d5, defender:0x284e67 };
export const WEAPONS = {
  patern:{name:'Patern 9',mag:15,reserve:60,damage:27,interval:.22,reload:1.45,spread:.0024,kick:.012,price:0,reward:300,pellets:1,range:65},
  kestrel:{name:'Kestrel',mag:30,reserve:90,damage:34,interval:.105,reload:2.25,spread:.0018,kick:.014,price:2400,reward:300,pellets:1,range:85},
  harrow:{name:'Harrow SG',mag:7,reserve:28,damage:15,interval:.78,reload:2.7,spread:.038,kick:.04,price:1800,reward:300,pellets:8,range:34},
};
export const NAMES = ['YOU · VESPER','CINDER','MICA','ROOK','SABLE','FEN','COBALT','SLATE','BRINE','WARD'];
export const BUY = [{id:'kestrel',price:2400},{id:'harrow',price:1800},{id:'grenade',price:300},{id:'armor',price:650},{id:'kit',price:200}];
