// The starter's mulberry32. Simulation and art use separate seeded streams.
export function mulberry32(initial) {
  let a=initial;
  return function random(){
    a|=0; a=(a+0x6d2b79f5)|0;
    let t=Math.imul(a^(a>>>15),1|a);
    t=(t+Math.imul(t^(t>>>7),61|t))^t;
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
